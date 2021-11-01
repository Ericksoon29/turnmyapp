const express = require('express')
const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");                                                                                                                                     
const cors = require('cors');
const bodyParser = require('body-parser')
const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/resportePark', async (req, res) => {
    const url = "mongodb+srv://Rosales123:Rosales123@cluster0.y32dq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
    const client = new MongoClient(url);
    const dbName = "park";
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection("park");
    console.log(req.params)
})

app.post('/registroEntrada', async (req, res) => {
    try {
            const url = "mongodb+srv://Rosales123:Rosales123@cluster0.y32dq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
            const client = new MongoClient(url);
            const dbName = "park";
            await client.connect();
            const db = client.db(dbName);
            const col = db.collection("park");
            const autoRegistrado = await col.findOne({"placas": req.body.placas, "active": 1});
            if(autoRegistrado ==null ){
                console.log(autoRegistrado)
                const p = await col.insertOne(req.body);
                const myDoc = await col.findOne();
                console.log(myDoc);
                res.status(200).send({'message': 'Se ha creado correctamente el usuario', 'code': 200})
            } else {
                res.status(200).send({'message': 'No se puede ingresar, Existe un vehiculo con las mismas placas, pase a administracion', 'code': 200})
            }
            
           
    } catch (err) {
    	    console.log(err.stack);
    }
})

app.post('/registroSalida', async (req, res) => {
    try{
        const url = "mongodb+srv://Rosales123:Rosales123@cluster0.y32dq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
        const client = new MongoClient(url);
        const dbName = "park";
	    await client.connect();
	    const db = client.db(dbName);
	    const col = db.collection("park");
        
        const autoRegistrado = await col.findOne({"placas": req.body.placas, "active": 1});
        // Calculo horas
        const horasDiferencia = calculardiferenciaHoras(autoRegistrado.horaEntrada, req.body.horaSalida);
        
        //tolerancia
        const toleranciaPark = tolerancia(horasDiferencia)

        if(!toleranciaPark){            
            switch (req.body.cliente.toUpperCase()) {
                case "PENSION":
                    const clientePensionado = cobroPensionado(horasDiferencia)
                    const updatePension = await col.findOneAndUpdate({"placas": req.body.placas, "active": 1}, 
                            {$set:{horaSalida : req.body.horaSalida, cliente: req.body.cliente, active: req.body.active, cobro: clientePensionado}},{new: false} )
                    res.status(200).send({'message': 'Gracias por tu visita!!', 'totalPagar': clientePensionado, 'code': 200})
                    return {'message': 'Gracias por tu visita!!', 'totalPagar': "$ " + clientePensionado + " pesos", 'code': 200}
                    break;
                case "NORMAL":
                    const clienteNormal = cobroNormal(horasDiferencia);
                    const updateNormal = await col.findOneAndUpdate({"placas": req.body.placas, "active": 1}, 
                            {$set:{horaSalida : req.body.horaSalida, cliente: req.body.cliente, active: req.body.active, cobro: clienteNormal}},{new: false} )
                    res.status(200).send({'message': 'Gracias por tu visita!!', 'totalPagar': clienteNormal, 'code': 200})
                    return {'message': 'Gracias por tu visita!!', 'totalPagar': clienteNormal, 'code': 200}
                    break;
                default:
                    return {}
                    break;
            }
        } else {
            const updateNormal = await col.findOneAndUpdate({"placas": req.body.placas, "active": 1}, 
                            {$set:{horaSalida : req.body.horaSalida, cliente: req.body.cliente, active: req.body.active, cobro: 0}},{new: false} )
            res.status(200).send({'message': 'Gracias por tu visita!!', 'totalPagar': 0, 'code': 200})
            return {'message': 'Gracias por tu visita!!', 'totalPagar': 0, 'code': 200}
        }
    }catch(err){
        console.log(err.message)
    }
})

function tolerancia(horas){
    const restanteHoras = horas.split(':')
    const totalHoras = restanteHoras[0]
    if(totalHoras == 0){
        const totalMinutosHoras = restanteHoras[1]
        if (totalMinutosHoras > 10) { 
            //no estas en la tolerancia
            return false;
        }else {
            //Estas en la tolerancia
            return true;
        }
    } else {
        return false
    }
    
}

function cobroNormal(horas){
    const restanteHoras = horas.split(':')
    const horasTotales = restanteHoras[0] * 10
    const minutosTotales = restanteHoras[1] * 10 / 60
    const totalCobro = horasTotales + minutosTotales
    return totalCobro
}

function cobroPensionado(horas) {
    const restanteHoras = horas.split(':')
    const totalCobro = restanteHoras[0] * 10
    const descunetoCobro = totalCobro * .10
    return descunetoCobro
}

function calculardiferenciaHoras(horaInicioReq, horaFinalReq){
  var hora_inicio = horaInicioReq;
  var hora_final = horaFinalReq;
  
  // Expresión regular para comprobar formato
  var formatohora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  // Si algún valor no tiene formato correcto sale
  if (!(hora_inicio.match(formatohora)
        && hora_final.match(formatohora))){
    return;
  }
  
  // Calcula los minutos de cada hora
  var minutos_inicio = hora_inicio.split(':')
    .reduce((p, c) => parseInt(p) * 60 + parseInt(c));
  var minutos_final = hora_final.split(':')
    .reduce((p, c) => parseInt(p) * 60 + parseInt(c));
  
  // Si la hora final es anterior a la hora inicial sale
  if (minutos_final < minutos_inicio) return;
  
  // Diferencia de minutos
  var diferencia = minutos_final - minutos_inicio;
  
  // Cálculo de horas y minutos de la diferencia
  var horas = Math.floor(diferencia / 60);
  var minutos = diferencia % 60;
  
  return horas + ':' + (minutos < 10 ? '0' : '') + minutos;  
}

app.listen(3000, () => console.log('Example app listening on port 3000!'))