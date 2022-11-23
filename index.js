const { Client, Location, List, Buttons, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const FileUpload = require('express-fileupload');
const http = require('http');
var qrcode = require('qrcode');
const axios = require('axios');

const {FormatterNumber} = require('./helpers/helpers')


const app = express();
const server = http.createServer(app)
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(FileUpload({
    debug: false
}))
const io = socketIO(server)
const client = new Client({
    authStrategy: new LocalAuth({clientId:"primary"}),
    puppeteer: { headless: true }
});

// const client= new Client({clientId:"primary"})

client.on('message', msg => {
    console.log(msg)
    if (msg.body == '!ping') {
        msg.reply('pong');
    }

    if (msg.body == "!gempa") {
      axios
        .get("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
        .then(function (response) {
          // handle success
          console.log(response.data);
        //   msg.reply(JSON.stringify(response.data.Infogempa.gempa));
            msg.reply('*info* *gempa* :\n' +
            'tgl '+response.data.Infogempa.gempa.Tanggal+',\n' +
            'pukul '+response.data.Infogempa.gempa.Jam+',\n' +
            'magnitude '+response.data.Infogempa.gempa.Magnitude+',\n' +
            '\n' +
            ''+response.data.Infogempa.gempa.Wilayah+'\n' +
            ''+response.data.Infogempa.gempa.Potensi+'\n' +
            'Shakemap :'+'\n' +
            'https://data.bmkg.go.id/DataMKG/TEWS/'+response.data.Infogempa.gempa.Shakemap+'\n' +
            '\n' +
            'sumber : BMKG')
        })
        .catch(function (error) {
          // handle error
          console.log(error);
        })
    }
    
});

client.initialize();

setInterval(function() {
    // your code goes here...
    client.pupPage.click("#pane-side")
}, 60 * 1000); // 60 * 1000 milsec

setInterval(function() {
    // your code goes here...
    client.sendMessage("6282227100068@c.us", 'ping active every  5 minutes');
}, 60*5 * 1000); // 60 * 1000 milsec

//socket io fuctions
io.on('connection',(socket)=>{
    socket.emit('message','Connecting . . . .')
    
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr,(err,url)=>{
            socket.emit('qr', url)
            socket.emit('message', 'QR Code Received Please Scan!')
        })
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
        socket.emit('message', 'Autentikasi succeed!')
    });

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
        socket.emit('message', 'Autentikasi failed!')
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit('message', 'Whatsapp is ready!')
        socket.emit('qr', 'https://static-new.miraheze.org/hololivewiki/9/9b/Kobo_Kanaeru_-_Portrait_01.png')
    });

    client.on('loading_screen', (percent, message) => {
        if(percent===100){
            socket.emit('message', 'Loading Done!')
        }
        else{
            socket.emit('message', 'Loading please wait...')
        }
    });

})

const checkRegistered = async (number) =>{
    let isRegistered = await client.isRegisteredUser(number);
    return isRegistered
}

app.get('/', (req, res) => {
    res.sendFile('index.html',{root : __dirname});
});

app.post('/send-message',
body('nomor').notEmpty(),
body('msg').notEmpty()
,async (req,res)=>{
    let errors = validationResult(req).formatWith(errmsg=>{
        return errmsg
    })

    if(!errors.isEmpty()){
        return res.status(422).json({
            status :false,
            message : errors.mapped()
        })
    }

    let nomor = FormatterNumber(req.body.nomor);
    let msg= req.body.msg

    let isRegistered = await checkRegistered(nomor)

    if(isRegistered===false){
        return res.status(422).json({
            status: false,
            response: "number is not registered"
        })
    }

    client.sendMessage(nomor, msg).then((respon) =>{
        res.status(200).json({
            status: true,
            response: respon
        })
    }).catch((err)=>{
        res.status(500).json({
            status:false,
            response:err
        })
    })
})

app.post('/send-media',
body('nomor').notEmpty(),
body('msg').notEmpty()
,async (req,res)=>{
    let errors = validationResult(req).formatWith(errmsg=>{
        return errmsg
    })

    if(!errors.isEmpty()){
        return res.status(422).json({
            status :false,
            message : errors.mapped()
        })
    }

    let nomor = FormatterNumber(req.body.nomor);
    let msg= req.body.msg
    let files = req.files.file
    let media = new MessageMedia(files.mimetype, files.data.toString('base64'),files.name)
    // console.log(media)
    // return

    let isRegistered = await checkRegistered(nomor)

    if(isRegistered===false){
        return res.status(422).json({
            status: false,
            response: "number is not registered"
        })
    }

    client.sendMessage(nomor, media, {caption: msg}).then((respon) =>{
        res.status(200).json({
            status: true,
            response: respon
        })
    }).catch((err)=>{
        res.status(500).json({
            status:false,
            response:err
        })
    })
})

app.post('/send-media-url',
body('nomor').notEmpty(),
body('msg').notEmpty()
,async (req,res)=>{
    let errors = validationResult(req).formatWith(errmsg=>{
        return errmsg
    })

    if(!errors.isEmpty()){
        return res.status(422).json({
            status :false,
            message : errors.mapped()
        })
    }

    let nomor = FormatterNumber(req.body.nomor);
    let msg= req.body.msg
    let files = req.body.file
    let media = await MessageMedia.fromUrl(files)
    // console.log(media)
    // return

    let isRegistered = await checkRegistered(nomor)

    if(isRegistered===false){
        return res.status(422).json({
            status: false,
            response: "number is not registered"
        })
    }

    client.sendMessage(nomor, media, {caption: msg}).then((respon) =>{
        res.status(200).json({
            status: true,
            response: respon
        })
    }).catch((err)=>{
        res.status(500).json({
            status:false,
            response:err
        })
    })
})

server.listen(8000, function(){
    console.log("app is listening on " +8000)
})