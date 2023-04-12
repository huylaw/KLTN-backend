const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try{
        const authHeader = req.header('token');
        const token = authHeader && authHeader.split(' ')[1];

        if(!token){
            return res.status(401).json({
                status: 401,
                message: "Unauthorized"
            })
        }
        jwt.verify(token, 'SECRETKEY', (error, decode) => {
            if(error){
                return res.status(401).json({
                    status: 401,
                    message: 'Lỗi rồi.'
                })
            }else{
                next();
            }
        });
    }catch(error){
        return res.status(403).json({
            status: 403,
            message: "Vui long dang nhap"
        })
    }
}

module.exports = verifyToken;