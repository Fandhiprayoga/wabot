const FormatterNumber = function (number){
    let val = number.replace(/\D/g,'')

    if(val.startsWith('0')){
        val = '62'+val.substr(1)
    }

    if(!val.endsWith('@c.us')){
        val = val+"@c.us"
    }

    return val
}

module.exports = {
    FormatterNumber
}