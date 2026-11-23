const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/payroll_manager';

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).render('error', {
                statusCode: 403,
                message: 'You do not have permission to perform this action.'
            });
        }

        next();
    };
}

function configureAuth(app) {
    if (!process.env.SESSION_SECRET) {
        throw new Error(
            'SESSION_SECRET is missing. Configure it in your .env file.'
        );
    }

    app.use(session({
        name: 'payroll.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: MONGO_URI,
            collectionName: 'sessions',
            ttl: 8 * 60 * 60
        }),
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000
        }
    }));

    app.use((req, res, next) => {
        res.locals.currentUser = req.session.user || null;
        next();
    });

    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    });

    app.get('/login', (req, res) => {
        if (req.session.user) {
            return res.redirect('/');
        }

        res.render('login', {
            error: null,
            email: ''
        });
    });

    app.post('/login', loginLimiter, async (req, res, next) => {
        try {
            const email = (req.body.email || '').trim().toLowerCase();
            const password = req.body.password || '';

            if (!email || !password) {
                return res.status(400).render('login', {
                    error: 'Please enter your email and password.',
                    email
                });
            }

            const user = await User.findOne({
                email,
                isActive: true
            });

            if (!user) {
                return res.status(401).render('login', {
                    error: 'Invalid email or password.',
                    email
                });
            }

            const passwordMatches = await bcrypt.compare(
                password,
                user.passwordHash
            );

            if (!passwordMatches) {
                return res.status(401).render('login', {
                    error: 'Invalid email or password.',
                    email
                });
            }

            req.session.regenerate((err) => {
                if (err) {
                    return next(err);
                }

                req.session.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                req.session.save((saveError) => {
                    if (saveError) {
                        return next(saveError);
                    }

                    res.redirect('/');
                });
            });
        } catch (error) {
            next(error);
        }
    });

    app.post('/logout', requireAuth, (req, res, next) => {
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }

            res.clearCookie('payroll.sid');
            res.redirect('/login');
        });
    });

    // All routes registered after this point require authentication.
    app.use(requireAuth);
}

module.exports = {
    configureAuth,
    requireRole
};