module.exports = function ({ app, dbConn, uploadPic, uploadMusic, constants }) {
  app.post("/users/create", uploadPic.single("avatar"), uploadMusic.single("music"), (req, res, next) => {
    try{
    // validate the avatar. The avatar is requied.
    console.log(req.file)
    const file = req.file;
    console.log("file")
    if (!file || !file.mimetype.includes("mpeg")) {
      res.status(200).jsonp({
        message: "Please upload your audio, the audio should be .mp3 format",
      });
    } else {

      const avatar = `/img/${file.filename}`;
      // get user information and check the required fields.
      const { email, password, fullname, age, gender, ccUid } = req.body;
      if (email && password && fullname && age && gender) {
        // validate the email existed in the system, or not.
        const sql = "SELECT * FROM user_account WHERE user_email = ?";
        dbConn.query(sql, [email], function (err, result) {
          if (result && result.length !== 0) {
            res.status(200).jsonp({ message: 'The email existed in the system' });
          } else {
            // create a new user if the email did not exist in the sytem.
            const users = [[email, password, fullname, age, avatar, gender, ccUid]];
            const insertSql = "INSERT INTO user_account (user_email, user_password, user_full_name, user_age, user_avatar, user_gender, user_cometchat_uid) VALUES ?";
            dbConn.query(insertSql, [users], function (err, result) {
              if (err) {
                res.status(200).jsonp({ message: "Cannot create your account, please try again" });
              } else {
                res.status(200).jsonp({ avatar, insertId: result.insertId });
              }
            });
          }
        });
      } else {
        return res.status(200).jsonp({ message: "Please input required fields" });
      }
    }
  }
  catch(err){
    console.error(err);
    res.status(500).send("發生錯誤");
  }}
  );

  const transformRecommendedUsers = (users) => {
    if (users && users.length !== 0) {
      return users.map(user => { 
        return {
          id: user.id, 
          user_age: user.user_age,
          user_avatar: user.user_avatar,
          user_cometchat_uid: user.user_cometchat_uid,
          user_email: user.user_email,
          user_full_name: user.user_full_name,
          user_gender: user.user_gender
        }
      });
    }
    return users;
  }

  const transformMatchedUsers = (data) => {
    const user = {   
      name: data.user_full_name,
      uid: data.user_cometchat_uid,
      avatar: data.user_avatar,
    }
    return user
  }


  app.post('/users/recommend', (req, res) => {
    const { gender, ccUid } = req.body;
    if (gender && ccUid) {
      const sql = "SELECT * FROM user_account WHERE user_gender = ? AND (user_cometchat_uid NOT IN (SELECT match_request_to FROM match_request WHERE match_request_from = ?) AND user_cometchat_uid NOT IN (SELECT match_request_from FROM match_request WHERE match_request_to = ? AND match_request_status = ?))";
      dbConn.query(sql, [gender, ccUid, ccUid, constants.matchRequestStatus.accepted], function (err, result) {
        if (err) {
          res.status(200).jsonp({ message: 'Cannot get your recommended users, please try again' });
        } else {
          const recommendedUsers = transformRecommendedUsers(result);
          res.status(200).jsonp(recommendedUsers);
        }
      });
    } else {
      res.status(200).jsonp({ message: "Please provide cometchat uid and user's gender" });
    }
  });

  app.post('/users/matches', (req, res) => {
    const {ccUid} = req.body;
    if (ccUid) {
      const sql = "SELECT * FROM match_request WHERE (match_request_from = ? OR  match_request_to = ? )AND match_request_status = ? ";
      dbConn.query(sql, [ccUid, ccUid, constants.matchRequestStatus.accepted], function (err, result) {
        if (err) {
          res.status(200).jsonp({ message: 'Cannot get your match users, please try again' });
        } else {
          let friendList = [];
          for(let match of result){
            if(match.match_request_from === ccUid){
              friendList.push(match.match_request_to)
            }
            else{
              friendList.push(match.match_request_from)
            }
          }
          res.status(200).jsonp(friendList);
        }
      });
    } else {
      res.status(200).jsonp({ message: "Please provide cometchat uid and user's gender" });
    }
  })

  app.post('/users/findUser', (req, res) => {
    const {ccUid} = req.body;
    if (ccUid) {
      const sql = "SELECT * FROM user_account  WHERE user_cometchat_uid = ?";
      dbConn.query(sql, [ccUid], function (err, result) {
        if (err) {
          res.status(200).jsonp({ message: 'Cannot get your match users, please try again' });
        } else {
          const recommendedUsers = transformMatchedUsers(result[0]);
          res.status(200).jsonp(recommendedUsers);
        }
      });
    } else {
      res.status(200).jsonp({ message: "Please provide cometchat uid and user's gender" });
    } 
  })
};