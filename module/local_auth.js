var auth = {
    passport: require('passport'),
    LocalStrategy: require('passport-local').Strategy,
    successRedrict: "/",
    failureRedirect: "/login",

    // passport.use(new BasicStrategy(...
    passportUse: new BasicStrategy(
        function(username, password, done) {
            User.findOne({ username: username }, function (err, user) {
                if (err) { return done(err); }
                if (!user) {
                    return done(null, false);
                }
                if (!user.validPassword(password)) {
                    return done(null, false);
                }
                return done(null, user);
            });
        }
    ),

    busStopOnly: passport.authenticate('local', { session: false }),

    uidOnly: passport.authenticate('local', { successRedirect: '/',
                                            failureRedirect: '/login',
                                            failureFlash: 'Invalid username or password.',
                                            successFlash: 'Welcome!' })
};
