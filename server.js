var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport	= require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var port        = process.env.PORT || 8080;
var jwt         = require('jwt-simple');
var nodemailer  = require('nodemailer');
var mailgun     = require('mailgun-js');

var Project     = require('./app/models/project');

// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
	if (req.method === 'OPTIONS') {
		res.end();
	} else {
	next();
	}
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// log to console
app.use(morgan('dev'));

// Use the passport package in our application
app.use(passport.initialize());

// demo Route (GET http://localhost:8080)
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

console.log(__dirname);
app.use(express.static(__dirname + '/public'));


// Start the server
app.listen(port);
console.log('There will be dragons: http://localhost:' + port);

// connect to database
mongoose.connect(config.database);

// pass passport for configuration
require('./config/passport')(passport);

// bundle our routes
var apiRoutes = express.Router();

// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/signup', function(req, res) {
  if (!req.body.name || !req.body.password) {
    res.json({success: false, msg: 'Please pass name and password.'});
  } else {
    var newUser = new User({
      name: req.body.name,
      lastName: req.body.lastName,
      password: req.body.password,
      email: req.body.email
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

// route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          res.json({success: true, msg: 'Authentication granted', user: {
            name: user.name,
            email: user.email
          }});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

// Contact API
apiRoutes.post('/contactus', (req, res) => {
    var name = req.body.name;
    var from = req.body.from;
    var message = req.body.message;
    var to = 'eddine.djerboua@gmail.com';

    const api_key = "5c3c8f9a5663d6101a20500cf0cdfbca-a4502f89-eb650772"

    const DOMAIN = 'sandboxa6d62a13.ok';
    const mg = mailgun({apiKey: api_key, domain: DOMAIN});
    const data = {
      from: from,
      to: to,
      subject: 'Hello',
      text: message
    };
    mg.messages().send(data, function (error, body) {
      if (!error) {
        res.json({success: true, msg: 'Thank you, your message was succesfully sent'})
      }
      res.json({success: false, msg: 'Something went wrong when sending the message, please try again later', error, body})
      console.log(error)
    });
    
    // var smtpTransport = nodemailer.createTransport('smtp://blacko.sardino%40gmail.com:RavioliSandwich@smtp.gmail.com');
		// var transporter = nodemailer.createTransport({
		// 	service: 'Gmail',
		// 	auth: {
		// 		type: 'OAuth2',
		// 		user: 'blacko.sardino@gmail.com',
		// 		clientId: '1064833285777-cmn1pa38efhclsuu77nsbm6aqsifgeha.apps.googleusercontent.com',
		// 		clientSecret: 'gzPoZJw1fpS69c9lnJOlqU-r',
		// 		refreshToken: '1/5q36-xubpPnylo-u93xUP56ZyheovwC1auWMmePCjCY',
		// 		accessToken: 'ya29.GltYBAZRtNxHShtQpn7wTwVg3Lp2Z-7wgpEiSmF8EUcZKvWYpZixuniD0KQ1TDQ4nYgR_OY_4IO3A2EwQpY4-Wa1JMkAm2pr8ilfV5iDD4tcPQjqrDJNot91YwQD'
		// 	}
		// })
		// transporter.on('token', token => {
		//     console.log('A new access token was generated');
		//     console.log('User: %s', token.user);
		//     console.log('Access Token: %s', token.accessToken);
		//     console.log('Expires: %s', new Date(token.expires));
		// });

    // var mailOptions = {
    //     from: from,
    //     to: to,
    //     subject: name+' cherche le contact',
    //     text: message + '\nfrom ' + from
    // }
    // transporter.sendMail(mailOptions, function(error, response){
    //     if(error){
    //         res.json({success: false, msg:'Something went wrong when sending the message, please try again later', error: error})
    //     }else{
    //       if (response.accepted && response.accepted.length > 0) {
    //         res.json({success: true, msg: 'Your message was succesfully sent'})
    //       }
    //       else {
    //         res.json({success: false, msg:'Something went wrong when sending the message, please try again later'})
    //       }
    //     }
    // });
});

apiRoutes.post('/contactMe', (req, res) => {
		var name = req.body.name;
		var from = req.body.from;
		var message = req.body.message;
		var to = 'eddine.djerboua@gmail.com';
		var transporter = nodemailer.createTransport({
	    host: 'smtp-pulse.com',
			port: '465',
			secure: true,
	    auth: {
	        user: 'eddine.djerboua@gmail.com',
	        pass: 'i6oipDBDNTfT'
	    }
		});

	// setup e-mail data, even with unicode symbols
	var mailOptions = {
	    from: `${name} <${from}>`, // sender address (who sends)
	    to: to, // list of receivers (who receives)
	    subject: `${name} cherche le contact`, // Subject line
	    text: message + '\nfrom ' + from, // plaintext body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, response){
			if(error){
					error.success = false;
					res.send(error)
			}else{
				if (response.accepted && response.accepted.length > 0) {
					res.json({success: true, msg: 'Your message was succesfully sent'})
				}
				else {
					res.json({success: false, msg:'Something went wrong when sending the message, please try again later'})
				}
			}
		});
})

apiRoutes.get('/getProjects', (req, res) => {
  if(req.query.id) {
    var id = req.query.id;
    console.log(id);
    Project.findOne({id: id}, (err, projects) => {
      if(err) {
        throw err
      }
      if (!projects) {
        return res.status(403).send({success: false, msg: 'Couldn\'t find your shit bro.'});
      }
      else {
        res.json({success: true, projects: projects});
      }

    })
  }
  else {
    Project.find({}, (err, projects) => {
      if(err) throw err;
      if (!projects) {
        return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
      }
      else {
        res.json({success: true, projects: projects});
      }

    })
  }

})

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

// connect the api routes under /api/*
app.use('/api', apiRoutes);
