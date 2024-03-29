module.exports = function ({ app, dbConn, upload, constants, uploadFile, getFileStream, unlinkFile, bcrypt}) {
  app.get('/files/:key', (req, res) => {
    const key = req.params.key
    const readStream = getFileStream(key)
  
    readStream.pipe(res)
  })
  
  
  app.post("/users/create", upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "music", maxCount: 1 },
  ]), async(req, res, next) => {
    try{
    // validate the avatar. The avatar is requied.    

    const file = req.files;
    if (!file.music[0] || !file.music[0].mimetype.includes("mpeg")) {
      res.status(200).jsonp({
        message: "Please upload your audio, the audio should be .mp3 format",
    });}
    else if (!file.avatar[0] || !file.avatar[0].mimetype.includes("jpeg")) {
      res.status(200).jsonp({
        message: "Please upload your audio, the audio should be .jpg format",
    });}
    else {

      const avatar = `/files/${file.avatar[0].key}`;
      const music = `/files/${file.music[0].key}`;
      // get user information and check the required fields.
      const { email, password, fullname, age, position, ccUid } = req.body;
      const hashpassword = await bcrypt.hash(password, 10);

      if (email && hashpassword && fullname && age && position) {
        // validate the email existed in the system, or not.
        const sql = "SELECT * FROM user_account WHERE user_email = ?";
        dbConn.query(sql, [email], function (err, result) {
          if (result && result.length !== 0) {
            res.status(200).jsonp({ message: 'The email existed in the system' });
          } else {
            // create a new user if the email did not exist in the sytem.
            const users = [[email, hashpassword, fullname, age, avatar, music, position, ccUid]];
            const insertSql = "INSERT INTO user_account (user_email, user_password, user_full_name, user_age, user_avatar, user_music_clip, user_position, user_uid) VALUES ?";
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
          user_music_clip: user.user_music_clip,
          user_uid: user.user_uid,
          user_email: user.user_email,
          user_full_name: user.user_full_name,
          user_position: user.user_position
        }
      });
    }
    return users;
  }

  const transformMatchedUsers = (data) => {
    const user = {   
      name: data.user_full_name,
      uid: data.user_uid,
      avatar: data.user_avatar,
    }
    return user
  }


  app.post('/users/recommend', (req, res) => {
    const { position, ccUid } = req.body;
    if (position && ccUid) {
      const sql = "SELECT * FROM user_account WHERE user_position = ? AND (user_uid NOT IN (SELECT match_request_to FROM match_request WHERE match_request_from = ?) AND user_uid NOT IN (SELECT match_request_from FROM match_request WHERE match_request_to = ? AND match_request_status = ?))";
      dbConn.query(sql, [position, ccUid, ccUid, constants.matchRequestStatus.accepted], function (err, result) {
        if (err) {
          res.status(200).jsonp({ message: 'Cannot get your recommended users, please try again' });
        } else {
          const recommendedUsers = transformRecommendedUsers(result);
          res.status(200).jsonp(recommendedUsers);
        }
      });
    } else {
      res.status(200).jsonp({ message: "Please provide uid and user's position" });
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
      res.status(200).jsonp({ message: "Please provide uid and user's position" });
    }
  })

  app.post('/users/findUser', (req, res) => {
    const {ccUid} = req.body;
    if (ccUid) {
      const sql = "SELECT * FROM user_account  WHERE user_uid = ?";
      dbConn.query(sql, [ccUid], function (err, result) {
        if (err) {
          res.status(200).jsonp({ message: 'Cannot get your match users, please try again' });
        } else {
          const recommendedUsers = transformMatchedUsers(result[0]);
          res.status(200).jsonp(recommendedUsers);
        }
      });
    } else {
      res.status(200).jsonp({ message: "Please provide uid and user's position" });
    } 
  })
};