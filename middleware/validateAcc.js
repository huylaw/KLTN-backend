const jwt = require('jsonwebtoken');

module.exports = {
    validateRegister: function(req, res, next){
        //username min 3 characters
        if(!req.body.username || req.body.username.length < 3){
            return res.send({
                status: 400,
                message: 'Username must contain at least 3 characters.'
            });
        }
        //password min 6 characters
        if(!req.body.password || req.body.password.length < 6){
            return res.send({
                status: 400,
                message: 'Password must contain at least 6 characters.'
            })
        }
        next();
    },
};