const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../config/databse')
const middleware = require('../middleware/validateAcc');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const checkUser = require('../middleware/checkUser');
const moment = require('moment');
const multer = require('multer');
const path = require('path');

var storage = multer.diskStorage({
    destination: (req, file, res) => {
        res(null, './image')
    },
    filename: (req, file, res) => {
        res(null, file.originalname)
    }
});
var upload = multer({
    storage: storage
});

//fomat date
function format_date(arr){
    for(let i of arr){
        if(i.birthday){
            i.birthday = moment(i.birthday).format('yyyy-MM-DD')
        }
        if(i.lunar_birthday){
            i.lunar_birthday = moment(i.lunar_birthday).format('yyyy-MM-DD')
        }
        if(i.deadday){
            i.deadday = moment(i.deadday).format('yyyy-MM-DD')
        }
        if(i.lunar_deadday){
            i.lunar_deadday = moment(i.lunar_deadday).format('yyyy-MM-DD')
        }
    }
}

//sort thành viên huyết thống và add con dâudâu
function sort_arr(arr_1, arr_2){
    for(let i=0; i<arr_1.length; i++){
        for(let j=0; j<arr_2.length; j++){
            if(arr_1[i].spouse == arr_2[j].id_user || arr_1[i].id_user == arr_2[j].spouse){
                arr_1.splice(i+1, 0, arr_2[j]);
                arr_2.splice(j, 1);
            }
        }
    }
}

//các đời từ f3 trở đi dùng cái này để sắp mảng theo đời.
function create_arrFx(arr_1, arr_2, arr_3, arr_4){
    var fi_father = arr_1.filter((i) => i.sex == 1);
    //var fi = [];
    for(let i in fi_father){
        var arr_i = [];
        for(let j in arr_2){
            if(arr_2[j].father == fi_father[i].id_user){
                arr_i.push(arr_2[j]);
            }
        }
        arr_i.sort((a, b)=>{
            return new Date(a.birthday) - new Date(b.birthday);
        });
        for(let k in arr_i){
            arr_4.push(arr_i[k]);
        }
    }
    sort_arr(arr_4, arr_3);
}

//register
router.post('/register', middleware.validateRegister, async (req, res, next) => {
    var sql = "SELECT *FROM user WHERE username = ?";
    await db.query(sql, req.body.username, async (error, result) => {
        if(result.length){
            return res.status(409).json({
                message: 'Username đã tồn tại.'
            });
        }else{
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
            var x = "INSERT INTO user SET ?";
            db.query(x, req.body, (error, result) => {
                if(error){
                    console.log(error);
                }
                return res.status(200).json({
                    message: 'Đăng ký thành công.'
                })
            })
        }
    })
});

//login
router.post('/login', (req, res, next) => {
    var sql = "SELECT * FROM user WHERE username = ?";
    db.query(sql, req.body.username, async (error, result) => {
        if(error){
            return res.status(400).json({
                message: error
            })
        }

        if(!result.length){
            return res.status(401).json({
                message: "Tên đăng nhập không tồn tại."
            });
        }
        
        const validPassword = await bcrypt.compare(req.body.password, result[0]['password']);
        format_date(result);
        delete result[0].password;
        if(validPassword){
            const token = jwt.sign({
                //username: result[0].username,
                id_user: result[0].id_user,
                role: result[0].role
            }, 'SECRETKEY', { expiresIn: '7d' });
            return res.status(200).json({
                    message: 'Đăng nhập thành công!',
                    token,
                    user: result[0],
                    role: result[0].role
                });
        }else{
            return res.status(401).json({
                message: "Tên đăng nhập hoặc mật khẩu không chính xác."
            })
        }
    })
});

//thay đổi mật khẩu.
router.put('/change_password/:id', verifyToken, checkUser, async (req, res) => {
    const id = req.params.id;
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
    const account = req.body;
    const sql = "UPDATE user SET username = ?, password = ? WHERE id_user = ?";

    db.query(sql, [ account.username, account.password, id ], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thay đổi thông tin tài khỏan thành công.'
        })
    })
});

// thay đổi quyền role
router.put('/change_role/:id', verifyToken, checkUser, async (req, res) => {
    const id = req.params.id;
    const user = req.body;
    const sql = "UPDATE user SET role = ? WHERE id_user = ?";

    db.query(sql, [ user.role, id ], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thay đổi quyền tài khỏan thành công.'
        })
    })
});

//get profile
router.get('/profile', verifyToken, (req, res) => {
    try{
        const authHeader = req.header('token');
        const token = authHeader && authHeader.split(' ')[1];
        const user = jwt.decode(token);
        var sql = "SELECT * FROM user WHERE id_user = ?";
        db.query(sql, user.id_user, (error, result) => {
            if(error){
                console.log(error);
            }
            if(result){
                delete result[0].password;
                res.json({
                    status: 200,
                    result
                })
            }
        })
    }catch(error){
        res.status(500).json({
            status: 500,
            error: "Server Error"
        })
    }
});

//get all user
router.get('/user', verifyToken, async (req, res) => {
    var sql = "SELECT * FROM user";
    await db.query(sql, (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: 'Not found'
            })
        }
        if(result){
            for(i of result){
                //delete i.username;
                delete i.password;
                if(i.birthday){
                    i.birthday = moment(i.birthday).format('yyyy-MM-DD')
                }
                if(i.lunar_birthday){
                    i.lunar_birthday = moment(i.lunar_birthday).format('yyyy-MM-DD')
                }
                if(i.deadday){
                    i.deadday = moment(i.deadday).format('yyyy-MM-DD')
                }
                if(i.lunar_deadday){
                    i.lunar_deadday = moment(i.lunar_deadday).format('yyyy-MM-DD')
                }
            }
        }
        res.json({
            status: 200,
            result
        });
    })
});

//get user by id
router.get('/user/:id', verifyToken, async (req, res) => {
    var sql = "SELECT * FROM user WHERE id_user = ?"
    await db.query(sql, req.params.id, (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            })
        }
        if(result){
            for(i of result){
                //delete i.username;
                delete i.password;
            }
            format_date(result);
            
            res.json({
                status: 200,
                result
            })
        }
    })
});

//add user
router.post('/user', verifyToken, checkRole, (req, res) => {
    const user = req.body;
    var sql = "INSERT INTO user SET ?";
    db.query(sql, user, (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            })
        }
        res.json({
            status: 200,
            message: "Thêm thành viên thành công."
        })
    })
})

//update image avatar
router.put('/avatar/:id', verifyToken, checkUser, upload.single('image'), async (req, res) => {
    var imgsrc = '';
    if(req.file){
        imgsrc = 'http://localhost:3000/image/' + req.file.filename;
    }
    var sql = "UPDATE user SET avatar = ? WHERE id_user = ?";
    db.query(sql, [imgsrc, req.params.id], (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            });
        }
        res.json({
            status: 200,
            message: "Cập nhật ảnh đại diện thành công."
        })
    })
});

//update user
router.put('/user/:id', verifyToken, checkUser, async (req, res) => {
    if(req.body.password){
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const user = req.body;
    const id = req.params.id;
    var sql = "UPDATE user SET name = ?, sex = ?, birthday = ?, lunar_birthday = ?, avatar = ?, country = ?, genus = ?, classify = ?, religion = ?, phone = ?, literacy = ?, father = ?, father_name = ?, mother = ?, mother_name = ?, spouse = ?, spouse_name = ?, domicile = ?, resident = ?, job = ?, work_address = ?, deadday = ?, lunar_deadday = ?, description = ? WHERE id_user = ?";
    db.query(sql, [user.name, user.sex, user.birthday, user.lunar_birthday, 
        user.avatar, user.country, user.genus, user.classify, user.religion, user.phone, 
        user.literacy, user.father, user.father_name, user.mother, user.mother_name, user.spouse, user.spouse_name, user.domicile, 
        user.resident, user.job, user.work_address, user.deadday, user.lunar_deadday, 
        user.description, id
    ], (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            });
        }
        res.json({
            status: 200,
            message: "Cập nhật thông tin thành công."
        })
    })
});

//delete user
router.delete('/user/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    var sql = "DELETE FROM user WHERE id_user = ?"
    db.query(sql, id, (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: 'Not Found'
            })
        }
        res.json({
            status: 200,
            message: 'Xóa thành viên thành công.'
        })
    })
});

//lấy danh sách những người con trai trong dòng họ.
router.get('/father', verifyToken, (req, res) => {
    const sql = 'SELECT id_user, name, genus, classify FROM user WHERE classify = 0 && sex = 1';
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }

        result.sort((a, b) => {
            return a.genus - b.genus;
        });

        res.json({
            status: 200,
            message: 'Success!',
            result
        })
    })
});

//lấy danh sách những con dâu trong dòng học.
router.get('/mother', verifyToken, (req, res) => {
    const sql = 'SELECT id_user, name, genus, classify FROM user WHERE classify = 1';
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }
        result.sort((a, b) => {
            return a.genus - b.genus;
        });
        res.json({
            status: 200,
            message: 'Success!',
            result
        })
    })
})

//Chỉnh sửa information clan
router.put('/clan_information', verifyToken, checkRole, async (req, res) => {
    const data = req.body;
    var sql = "UPDATE clan SET information = ?, clan_rules = ?";
    await db.query(sql, [data.information, data.clan_rules], (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            });
        }
        res.json({
            status: 200,
            message: "Cập nhật thông tin thành công."
        })
    }) 
})

//lấy thông tin clan
router.get('/clan_information', verifyToken, async (req, res) => {
    var sql = "SELECT * FROM clan";
    await db.query(sql, (error, result) => {
        if(error){
            res.status(404).json({
                status: 404,
                message: "Not Found"
            });
        }
        res.json({
            status: 200,
            message: "Success!",
            result
        })
    })
});

//Xác định mối quan hệ
router.post('/relationship', verifyToken, async (req, res) => {
    const id_user1 = req.body.id_user1;
    const id_user2 = req.body.id_user2;
    const sql = 'SELECT * FROM user';

    await db.query(sql, (error, result) => {
        if(error){
            console.log(error);
            res.json({
                status: 404,
                message: 'Not Found'
            })
        }
        // chuẩn hóa result
        for(i of result){
            delete i.username;
            delete i.password;
            delete i.role;
        }
        format_date(result); //chuẩn hóa ngày tháng năm sinh
        //tìm đời thấp nhất
        var max_genus = result.reduce((a, b) => {
            return (a.genus > b.genus) ? a.genus : b.genus;
        })
        var genealogy = []; //mảng chứa danh sách các mảng đã sort theo vai vế.
        var fx = result.filter((i) => i.classify == 1); // mảng chứa các thành viên là con dâu.
        // push các mảng và mảng genealogy 
        for(let i = 1; i<= max_genus; i++){
            let index = i;
            let arr = result.filter((i) => i.genus == index && i.classify == 0);
            genealogy.push(arr);
        }
        //sort từng mảng trong genealogy
        for(let i = 0; i < max_genus; i++){
            if(i == 0){
                sort_arr(genealogy[i], fx);
            }else if(i == 1){
                genealogy[i].sort((a, b) => {
                    return new Date(a.birthday) - new Date(b.birthday);
                });
                sort_arr(genealogy[i], fx);
            }else{
                var fi = [];
                create_arrFx(genealogy[i-1], genealogy[i], fx, fi);
                genealogy[i] = fi;
            }
        }
        // mảng tương tự result nhưng đã được sort vai vế
        var data = [];
        for(let i of genealogy){
            for(let j of i){
                data.push(j);
            }
        }
        var user = []; // mảng chứa 2 user khi filter trong result
        user = data.filter((i) => i.id_user == id_user1 || i.id_user == id_user2);    
        //nếu không tìm được 2 thành viên trong result thì trả về nhập lại tên
        if(user.length < 2){
            return res.json({
                message: "Nhập lại tên thành viên.",
                title: 'Lỗi',
                variant: 'danger',
            });
        }
        // 2 biến đại diện cho 2 user
        var user_1 = user[0],
            user_2 = user[1]; 
        var relationship = '', diff_genus;
        //bắt đầu xác định mối quan hệ:
        // 1: Đối với những thông tin đã có sẵn
        if(user_1.spouse == user_2.id_user || user_1.id_user == user_2.spouse){
            relationship = 'Chồng - vợ'
        }else if(user_1.father == user_2.id_user || user_1.id_user == user_2.father){
            relationship = 'Bố - con'
        }else if(user_1.mother == user_2.id_user || user_1.id_user == user_2.mother){
            relationship = 'Mẹ - con'
        }else{ // xác định dựa theo gennus
            diff_genus = Math.abs(user_1.genus - user_2.genus); // tìm chênh lệch giữa 2 đời
            if(diff_genus == 0){ // cùng đời: anh em  / chị em
                if(user_1.classify == 0 && user_2.classify == 0){
                    if(user_1.father == user_2.father){
                        user_1.sex == 0 ? relationship = 'Chị em ruột' : relationship = 'Anh em ruột';
                    }else{
                        user_1.sex == 0 ? relationship = 'Chị em (con chú - con bác)' : relationship = 'Anh em (con chú - con bác)';
                    }
                }else if(user_1.classify == 1 && user_2.classify == 0){
                    relationship = 'Chị dâu - em chồng';
                }else if(user_1.classify == 0 && user_2.classify == 1){
                    user_1.sex == 0 ? relationship = 'Chị chồng - em dâu' : relationship = 'Anh chồng - em dâu';
                }else if(user_1.classify == 1 && user_2.classify == 1){
                    relationship = 'Chị dâu - em dâu';
                }else{
                    relationship = 'Chưa xác định được mối quan hệ'
                }
            }else if(diff_genus == 1){// cách nhau 1 đời: mẹ con, bác cháu, chú cháu, thím cháu, cô cháu.
                if(user_1.classify == 1 && user_2.classify == 0){ // bác dâu - cháu || thím - cháu || mẹ - con
                    let father_user2 = data.filter((i) => i.id_user == user_2.father)[0];
                    if(user_1.spouse == father_user2.id_user){
                        relationship = 'Mẹ - con';
                    }else{
                        // xác định index của user_1 và  father_user2
                        let arr = genealogy[user_1.genus - 1],
                            index1, index2;
                        for(let i=0; i< arr.length; i++){
                            if(arr[i].id_user == user_1.id_user) index1 = i;
                            if(arr[i].id_user == father_user2.id_user) index2 = i;  
                        }
                        // so sánh index
                        index1 < index2 ? relationship = 'Bác dâu - cháu' : relationship = 'Thím - cháu';
                    }
                }else if(user_1.classify == 1 && user_2.classify == 1){ // bác dâu - cháu dâu || mẹ chồng - con dâu || thím - cháu dâu
                    let spouse_user2 = data.filter((i) => i.id_user == user_2.spouse)[0]; // chồng
                    let father_spouseUser2 = data.filter((i) => i.id_user == spouse_user2.father)[0]; // bố chồng
                    if(user_1.spouse == father_spouseUser2.id_user){
                        relationship = 'Mẹ chồng - con dâu'
                    }else{
                        // xác định index của user_1 và father_spouseUser2 
                        let arr = genealogy[user_1.genus - 1],
                            index1, index2;
                        for(let i in arr){
                            if(arr[i].id_user == user_1.id_user) index1 = i;
                            if(arr[i].id_user == father_spouseUser2.id_user) index2 = i;  
                        }
                        // so sánh index
                        index1 < index2 ? relationship = 'Bác dâu - cháu dâu' : relationship = 'Thím - cháu dâu';
                    }
                }else if(user_1.classify == 0 && user_2.classify == 0){ //bác - cháu ruột || chú - cháu ruột || cô - cháu ruột
                    let father_user2 = data.filter((i) => i.id_user == user_2.father)[0];
                    let arr = genealogy[user_1.genus - 1],
                        index1, index2;
                    for(let i in arr){
                        if(arr[i].id_user == user_1.id_user) index1 = i;
                        if(arr[i].id_user == father_user2.id_user) index2 = i;  
                    }
                    // so sánh index
                    if(index1 < index2){
                        relationship = 'Bác - cháu ruột';
                    }else if(index1 > index2){
                        user_1.sex == 1 ? relationship = 'Chú - cháu ruột' : relationship = 'Cô - cháu ruột'
                    }else{
                        relationship = 'Bố - con';
                    }
                }else if(user_1.classify == 0 && user_2.classify == 1){ // bác- cháu dâu || chú - cháu dâu || cô - cháu dâu || bố chồng - con dâu
                    let spouse_user2 = data.filter((i) => i.id_user == user_2.spouse)[0]; // chồng
                    let father_spouseUser2 = data.filter((i) => i.id_user == spouse_user2.father)[0]; // bố chồng
                    let arr = genealogy[user_1.genus - 1],
                        index1, index2;
                    for(let i in arr){
                        if(arr[i].id_user == user_1.id_user) index1 = i;
                        if(arr[i].id_user == father_spouseUser2.id_user) index2 = i;  
                    }
                    if(index1 < index2){
                        relationship = 'Bác - cháu dâu';
                    }else if(index1 > index2){
                        user_1.sex == 1 ? relationship = 'Chú - cháu dâu' : relationship = 'Cô - cháu dâu';
                    }else{
                        relationship = 'Bố chồng - con dâu';
                    }
                }else{
                    relationship = 'Chưa xác định được mối quan hệ';
                }
            }else if(diff_genus == 2){
                if(user_1.classify == 0 && user_2.classify == 0){ // ông(nội) - cháu ruột || ông(bác) - cháu || bà bác - cháu || ông(chú) - cháu || bà(cô) - cháu  
                    let fatherUser2 = data.filter((i) => i.id_user == user_2.father)[0]; //bố
                    let grandFatherUser2 = data.filter((i) => i.id_user == fatherUser2.father)[0]; // ông
                    let arr = genealogy[user_1.genus - 1],
                        index1, index2;
                    for(let i in arr){
                        if(arr[i].id_user == user_1.id_user) index1 = i;
                        if(arr[i].id_user == grandFatherUser2.id_user) index2 = i;  
                    }
                    if(index1 < index2){
                        user_1.sex == 1 ? relationship = 'Ông bác - cháu' : relationship = 'Bà bác - cháu';
                    }else if(index1 > index2){
                        user_1.sex == 1 ? relationship = 'Ông chú - cháu' : relationship = 'Bà cô - cháu';
                    }else{
                        relationship = 'Ông nội - cháu ruột';
                    }
                }else if(user_1.classify == 0 && user_2.classify == 1){ // ông(nội) - cháu dâu || bà bác - cháu dâu || ông(bác) - cháu dâu || ông(chú) - cháu dâu || bà(cô) - cháu dâu 
                    let spouseUser2 = data.filter((i) => i.id_user == user_2.spouse)[0]; //chồng
                    let fatherSpouseUser2 = data.filter((i) => i.id_user == spouseUser2.father)[0]; // bố chồng
                    let gandFatherSpouseUser2 = data.filter((i) => i.id_user == fatherSpouseUser2.father)[0]; // ông nội của chồng.
                    let arr = genealogy[user_1.genus - 1],
                        index1, index2;
                    for(let i in arr){
                        if(arr[i].id_user == user_1.id_user) index1 = i;
                        if(arr[i].id_user == gandFatherSpouseUser2.id_user) index2 = i;  
                    }
                    if(index1 < index2){
                        user_1.sex == 1 ? relationship = 'Ông bác - cháu dâu' : relationship = 'Bà bác - cháu dâu';
                    }else if(index1 > index2){
                        user_1.sex == 1 ? relationship = 'Ông chú - cháu dâu' : relationship = 'Bà cô - cháu dâu';
                    }else{
                        relationship = 'Ông nội - cháu dâu';
                    }
                }else if(user_1.classify == 1 && user_2.classify == 0){ // bà(nội) - cháu ruột || bà bác (vợ của ông bác) - cháu || bà thím - cháu.
                    let fatherUser2 = data.filter((i) => i.id_user == user_2.father)[0]; //bố
                    let grandFatherUser2 = data.filter((i) => i.id_user == fatherUser2.father)[0]; // ông
                    if(user_1.spouse == grandFatherUser2.id_user || grandFatherUser2.spouse == user_1.id_user){
                        relationship = 'Bà nội - cháu ruột';
                    }else{
                        let arr = genealogy[user_1.genus - 1],
                            index1, index2;
                        for(let i in arr){
                            if(arr[i].id_user == user_1.id_user) index1 = i;
                            if(arr[i].id_user == grandFatherUser2.id_user) index2 = i;  
                        }
                        index1 < index2 ? relationship = 'Bà bác(vợ của ông bác) - cháu' : relationship = 'Bà thím - cháu';
                    }
                }else if(user_1.classify == 1 && user_2.classify == 1){ // bà(nội)-cháu dâu || bà bác(vợ của ông bác)-cháu dâu || bà thím-cháu dâu
                    let spouseUser2 = data.filter((i) => i.id_user == user_2.spouse)[0]; //chồng
                    let fatherSpouseUser2 = data.filter((i) => i.id_user == spouseUser2.father)[0]; // bố chồng
                    let gandFatherSpouseUser2 = data.filter((i) => i.id_user == fatherSpouseUser2.father)[0]; // ông nội của chồng.
                    if(user_1.spouse == gandFatherSpouseUser2.id_user || user_1.id_user == gandFatherSpouseUser2.spouse){
                        relationship = 'Bà nội - cháu dâu';
                    }else{
                        let arr = genealogy[user_1.genus - 1],
                            index1, index2;
                        for(let i in arr){
                            if(arr[i].id_user == user_1.id_user) index1 = i;
                            if(arr[i].id_user == gandFatherSpouseUser2.id_user) index2 = i;  
                        }
                        index1 < index2 ? relationship = 'Bà bác(vợ của ông bác) - cháu dâu' : relationship = 'Bà thím - cháu dâu';
                    }
                }else{
                    relationship = 'Chưa xác định đc mối quan hệ';
                }
            }else if(diff_genus == 3){ // ông cố - chắt ruột || bà cố - chắt ruột || ông cố - chắt dâu || bà cố - chắt dâu.
                if(user_2.classify == 0){
                    user_1.sex == 1 ? relationship = 'Ông cố - chắt ruột' : relationship = 'Bà cố - chắt ruột';
                }else{
                    user_1.sex == 1 ? relationship = 'Ông cố - chắt dâu' : relationship = 'Bà cố - chắt dâu';
                }
            }else{ // ông kỵ - chút ruột || ông kỵ - chút dâu || bà kỵ - chút ruột || bà kỳ - chút dâu
                if(user_2.classify == 0){
                    user_1.sex == 1 ? relationship = 'Ông kỵ - chút ruột' : relationship = 'Bà kỵ - chút ruột';
                }else{
                    user_1.sex == 1 ? relationship = 'Ông kỵ - chút dâu' : relationship = 'Bà kỵ - chút dâu';
                }
            }
        }
        //chuẩn hóa và sort theo thứ tự vai vế.
        res.json({
            status: 200,
            message: "Success!",
            title: 'Thành công!',
            variant: 'success',
            relationship,
            user
        })
    })
});
// chuẩn hóa
function mapArr(a, b){
    a.id_user = b.id_user
    a.name = b.name;
    a.image = b.avatar;
    a.sex = b.sex;
    a.birthday = b.birthday;
    a.genus = b.genus;
    a.classify = b.classify;
    a.father = b.father;
    a.mother = b.mother;
    a.spouse = b.spouse;
}

//đệ quy 
// function tree(arr_1, data, count){
//     if(count > 1){
//         count--;
//         var arr_children = [];
//         for(let i in arr_1){
//             let children = arr_1[i];
//             children.mate = data.filter((i) => i.spouse == children.id_user)[0];
//             children.children = data.filter((i) => i.father == children.id_user);

//             arr_children = children.children;
//             tree(arr_children, data, count);
//         }
//     }
// }

//đệ quy phả đồ
function tree(arr_1, data){
        // arr_1: chứa danh sách childrent
    for(let i in arr_1){
        // tìm trong data 1 mảng chứa con của arr_1[i]
        var childrents = data.filter((val) => val.father == arr_1[i].firstPerson.id_user);
        for(let j of childrents){
            if(j.sex == 0){
                arr_1[i].children.push({
                    firstPerson: j,
                    children: []
                });
            }else if(j.sex == 1){
                let spouse = data.filter((val) => val.spouse == j.id_user);
                arr_1[i].children.push({
                    firstPerson: j,
                    secondPerson: spouse[0],
                    children: []
                })
            }
        }
        if(arr_1[i].children.length > 0){
            tree(arr_1[i].children, data);
        }
    }
};

// vẽ phả đồ
router.get('/genealogy', verifyToken, async (req, res) => {
    var sql = "SELECT * from user";
    await db.query(sql, (error, result) => {
        if(error){
            console.log(error);
            res.json({
                status: 404,
                message: 'Not Found'
            })
        }
        for(let i of result){
            delete i.lunar_birthday; delete i.country; delete i.religion; delete i.phone; 
            delete i.literacy; delete i.domicile; delete i.resident; delete i.job; 
            delete i.work_address; delete i.deadday; delete i.lunar_deadday; delete i.description;
            delete i.username; delete i.password; delete i.role;
        }
        format_date(result);
        var max_genus = result.reduce((a, b) =>{
            return (a.genus > b.genus) ? a.genus : b.genus;
        })
        //tách các đời thành từng mảng riêng và con dâu thành mảng
        var genealogy = [];
        var fx = result.filter((i) => i.classify == 1);
        for(let i = 1; i<= max_genus; i++){
            let index = i;
            let arr = result.filter((i) => i.genus == index && i.classify == 0);
            genealogy.push(arr);
        }
        //sort từng mảng trong genealogy
        for(let i = 0; i < max_genus; i++){
            if(i == 0){
                sort_arr(genealogy[i], fx);
            }else if(i == 1){
                genealogy[i].sort((a, b) => {
                    return new Date(a.birthday) - new Date(b.birthday);
                });
                sort_arr(genealogy[i], fx);
            }else{
                var fi = [];
                create_arrFx(genealogy[i-1], genealogy[i], fx, fi);
                genealogy[i] = fi;
            }
        }
        // chuyển đổi thuộc tính avatar -> image;
        var data = []
        for(let i in genealogy){
            let arr = genealogy[i];
            for(let j in arr){
                let a = {};
                mapArr(a, arr[j]);
                genealogy[i][j] = a;
                data.push(a);
            }
        }
        var treeData = [];
        var node_0 = genealogy[0];
        treeData.push({
            firstPerson: node_0[0],
            secondPerson: node_0[1],
            children: []
        });
        var node_1 = genealogy[1];
        for(let i of node_1){
            if(i.classify == 0 && i.sex == 0){
                treeData[0].children.push({
                    firstPerson: i,
                    children: [],
                })
            }else if(i.classify == 0 && i.sex == 1){
                let spouse = node_1.filter((val) => val.id_user == i.spouse);
                if(spouse.lenght == 0){
                    treeData[0].children.push({
                        firstPerson: i,
                        children: [],
                    });
                }else{
                    treeData[0].children.push({
                        firstPerson: i,
                        secondPerson: spouse[0],
                        children: [],
                    })
                }
            }
        }

        tree(treeData[0].children, data);

        // var treeData;
        // treeData = data.filter((i) => !i.father && i.classify == 0)[0];
        // treeData.mate = data.filter((i) => i.spouse == treeData.id_user)[0];
        // treeData.children = data.filter((i) => i.father == treeData.id_user);
        // tree(treeData.children, data, max_genus);

        res.json({
            status: 200,
            message: 'Success',
            treeData,
        })
    })
});

//thống kê
router.get('/statistical', verifyToken, (req, res) => {
    var sql = "SELECT * FROM user"
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
            res.status(404).json({
                status: 404,
                message: 'Not Found'
            })
        }
        var statistical = [];
        //thống kê tỉ lệ nam nữ
        var object1 = { series: [], }
        var male = result.filter((i) => i.sex == 1);
        var female = result.filter((i) => i.sex == 0);
        var series = [];
        series.push(male.length);
        series.push(female.length);
        var labels = ['Nam', 'Nữ'];
        object1.title = 'Giới tính'
        object1.series = series;
        object1.labels = labels;
        statistical.push(object1);
        //thống kê tỉ lệ nơi làm việc
        var object2 = { series: [], };
        var work_address = [];
        for(let i in result){
            work_address.push(result[i].work_address);
        }
        const set = new Set(work_address);
        const arr_address = [...set];
        var value = [];
        for(let i=0; i<arr_address.length; i++){
            let x = arr_address[i]
            let y = work_address.filter((i) => i == x);
            value.push(y.length);
        }
        object2.title = 'Nơi làm việc'
        object2.series = value;
        object2.labels = arr_address;
        statistical.push(object2);

        res.json({
            status: 200,
            message: 'Success!',
            statistical,
        })
    })
});

//thống kê thu tiền cá nhân
router.get('/statictical_money/:id', verifyToken, checkUser, (req, res) => {
    const id_user = req.params.id;
    var sql = 'SELECT * FROM collect_money WHERE id_user = ?';
    db.query(sql, id_user, (error, result) => {
        if(error){
            console.log(error);
        }
        for(let i in result){
            if(result[i].date_collect){
                result[i].date_collect = moment(result[i].date_collect).format('DD-MM-yyyy')
            }
        }
        res.json({
            status: 200,
            message: 'Success',
            result,
        })
    })
});

//thu tiền
router.post('/collect_money', verifyToken, checkRole, (req, res) => {
    const data = req.body;
    var sql = "INSERT INTO collect_money SET ?"
    db.query(sql, data, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thêm mới thành công.'
        })
    })
});

//lấy danh sách thu tiền
router.get('/collect_money', verifyToken, (req, res) => {
    var sql = "SELECT * FROM collect_money";
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }
        var bank = 0;
        for(let i in result){
            if(result[i].date_collect){
                result[i].date_collect = moment(result[i].date_collect).format('yyyy-MM-DD')
            }
            bank += Number(result[i].money);
        }
        result.sort((a, b) => {
            return new Date(b.date_collect) - new Date(a.date_collect);
        });

        res.json({
            status: 200,
            message: 'Success!',
            bank,
            result,
        })
    })
});

//chỉnh sửa thông tin thu tiền.
router.put('/collect_money/:id', verifyToken, checkRole, (req, res) => {
    const data = req.body;
    const id = req.params.id;
    var sql = "UPDATE collect_money SET id_user = ?, name_user = ?, money = ?, date_collect = ?, description = ? WHERE id = ?";
    db.query(sql, [ data.id_user, data.name_user, data.money, data.date_collect, data.description, id ], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Cập nhật thông tin thành công.'
        })
    })
});

//xóa thông tin thu tiền
router.delete('/collect_money/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM collect_money WHERE id = ?';
    db.query(sql, id, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Xóa thông tin thành công'
        })
    })
});

//chi tiền
router.post('/spend_money', verifyToken, checkRole, (req, res) => {
    const data = req.body;
    var sql = "INSERT INTO pay SET ?";
    db.query(sql, data, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thêm mới thành công'
        })
    })
});

//lấy danh sách chi tiền
router.get('/spend_money', verifyToken, (req, res) => {
    var sql = "SELECT * FROM pay";
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }
        var pay = 0;
        for(let i in result){
            if(result[i].date_pay){
                result[i].date_pay = moment(result[i].date_pay).format('yyyy-MM-DD')
            }
            pay += Number(result[i].money);
        }
        
        result.sort((a, b) => {
            return new Date(b.date_pay) - new Date(a.date_pay);
        });

        res.json({
            status: 200,
            message: 'Success',
            pay, result
        })
    })
});

//chỉnh sửa thông tin chi tiền
router.put('/spend_money/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const sql = 'UPDATE pay SET date_pay = ?, money = ?, event_pay = ?, description = ? WHERE id = ?';
    db.query(sql, [ data.date_pay, data.money, data.event_pay, data.description, id ], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Cập nhật thông tin thành công'
        })
    })
});

//xóa thông tin chi tiền
router.delete('/spend_money/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM pay WHERE id = ?';
    db.query(sql, id, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Xóa thông tin thành công'
        })
    })
});

//thêm mới sự kiện
router.post('/event', verifyToken, checkRole, (req, res) => {
    const data = req.body;
    const sql = 'INSERT INTO event SET ?';
    db.query(sql, data, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thêm sự kiện thành công.'
        })
    })
});

//chỉnh sửa sự kiện
router.put('/event/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const sql = 'UPDATE event SET content = ?, date = ?, edit = ? WHERE id_event = ?';
    db.query(sql, [ data.content, data.date, data.edit, id ], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Cập nhật sự kiện thành công.'
        })
    })
});

//xóa sự kiện
router.delete('/event/:id', verifyToken, checkRole, (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM event WHERE id_event = ?';
    db.query(sql, id, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Xóa sự kiện thành công'
        })
    })
});

//get all event
router.get('/event', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM event';
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }
        for(let i of result){
            i.date = moment(i.date).format('yyyy-MM-DD');
        }
        result.reverse();
        res.json({
            status: 200,
            message: 'Success',
            result
        })
    })
})

// add notifycation
router.post('/notification', verifyToken, (req, res) => {
    const notifi = req.body;
    const sql = 'INSERT INTO notifycation SET ?';
    db.query(sql, notifi, (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Thêm thông báo thành công.'
        })
    })
});

// get notification
router.get('/notification', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM notifycation';
    db.query(sql, (error, result) => {
        if(error){
            console.log(error);
        }
        result.reverse();
        for(let i of result){
            if(i.date){
                i.date = moment(i.date).format("HH:mm DD-MM-YYYY")
            }
        }
        res.json({
            status: 200,
            message: 'Success',
            result
        })
    })
});

// get notification theo id_to (người nhận đc thông báo)
router.get('/notification/:id', verifyToken, checkUser, (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM notifycation WHERE id_to = ?';
    db.query(sql, id, (error, result) => {
        if(error) console.log(error); 

        result.reverse();
        for(let i of result){
            if(i.date) i.date = moment(i.date).format("HH:mm DD-MM-YYYY")
        }
        res.json({
            status: 200,
            message: 'Success!',
            result
        })
    })
})

// thay đổi check_read
router.put('/notification/:id', verifyToken, (req, res) => {
    const id = req.params.id;
    const sql = 'UPDATE notifycation SET check_read = ? WHERE id = ?';
    db.query(sql, [0, id], (error, result) => {
        if(error){
            console.log(error);
        }
        res.json({
            status: 200,
            message: 'Success'
        })
    })
})

// lấy danh sách admin
router.get('/admin', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM user WHERE role = ?';
    db.query(sql, 0, (error, result) => {
        if(error){
            console.log(error);
        }
        if(result){
            for(i of result){
                //delete i.username;
                delete i.password;
            }
            res.json({
                status: 200,
                message: 'Success',
                result
            })
        }
    })
});

module.exports = router;