const { Router } = require('express');
const router = new Router();
const bcryptjs = require('bcryptjs');
const saltRounds = 10;
const mongoose = require('mongoose');
const User = require('../models/User.model');


router.get('/signup', (req, res) => res.render('./auth/signup'));
router.post('/signup', (req, res, next) => {
    const { username, email, password } = req.body;
    // make sure users fill all mandatory fields:
    if (!username || !email || !password) {
        res.render('auth/signup', { errorMessage: 'All fields are mandatory. Please provide your username, email and password.' });
        return;
    }
    const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    if (!regex.test(password)) {
        res
            .status(500)
            .render('auth/signup', { errorMessage: 'Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter.' });
        return;
    }
    bcryptjs
        .genSalt(saltRounds)
        .then(salt => bcryptjs.hash(password, salt))
        .then(hashedPassword => {
            return User.create({
                // username: username
                username,
                email,
                // passwordHash => this is the key from the User model
                //     ^
                //     |            |--> this is placeholder (how we named returning value from the previous method (.hash()))
                passwordHash: hashedPassword
            });
        })
        .then(userFromDB => {
            console.log('Newly created user is: ', userFromDB);
            res.redirect('./users/user-profile');
        })
        .catch(error => {
            if (error instanceof mongoose.Error.ValidationError) {
                res.status(500).render('auth/signup', { errorMessage: error.message });
            } else if (error.code === 11000) {
                res.status(500).render('auth/signup', {
                    errorMessage: 'Username and email need to be unique. Either username or email is already used.'
                });
            } else {
                next(error);
            }
        }) // close .catch()
}) // close router.post()

router.get('/login', (req, res) => res.render('auth/login'));
router.post('/login', (req, res, next) => {
    console.log('SESSION =====> ', req.session);
    const { username, password } = req.body;

    if (username === '' || password === '') {
        res.render('auth/login', {
            errorMessage: 'Please enter both username and password to login.'
        });
        return;
    }

    User.findOne({ username })
        .then(user => {
            if (!user) {
                res.render('auth/login', { errorMessage: 'Username not registered.' });
                return;
            } else if (bcryptjs.compareSync(password, user.passwordHash)) {
                res.render('main', { user });
                //******* SAVE THE USER IN THE SESSION ********//
                req.session.currentUser = user;
            } else {
                res.render('auth/login', { errorMessage: 'Incorrect password.' });
            }
        })
        .catch(error => next(error));
});

router.get('/userProfile', (req, res) => {
    res.render('users/user-profile', { userInSession: req.session.currentUser });
  });

module.exports = router;