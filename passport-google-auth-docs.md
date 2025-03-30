# Tài liệu: Xác thực Google OAuth với Passport.js

## Giới thiệu

Tài liệu này cung cấp hướng dẫn đầy đủ về cách triển khai xác thực Google OAuth trong ứng dụng Express.js sử dụng Passport.js. Bạn có thể áp dụng các nguyên tắc này cho nhiều dự án khác nhau, với bất kỳ cơ sở dữ liệu nào.

## Mục lục

1. [Yêu cầu](#yêu-cầu)
2. [Cài đặt](#cài-đặt)
3. [Thiết lập Google OAuth](#thiết-lập-google-oauth)
4. [Cấu trúc dự án](#cấu-trúc-dự-án)
5. [Cấu hình Passport](#cấu-hình-passport)
6. [Tạo middleware xác thực](#tạo-middleware-xác-thực)
7. [Tạo service xử lý người dùng](#tạo-service-xử-lý-người-dùng)
8. [Tạo routes](#tạo-routes)
9. [Tích hợp vào ứng dụng](#tích-hợp-vào-ứng-dụng)
10. [Xử lý lỗi và bảo mật](#xử-lý-lỗi-và-bảo-mật)
11. [Các mẫu code phổ biến](#các-mẫu-code-phổ-biến)
12. [Khắc phục sự cố](#khắc-phục-sự-cố)

## Yêu cầu

- Node.js (>= 12.x)
- NPM hoặc Yarn
- Express.js
- Passport.js
- Database (MySQL, PostgreSQL, MongoDB, v.v.)

## Cài đặt

```bash
# Cài đặt các package cần thiết
npm install express passport passport-google-oauth20 express-session

# Tùy thuộc vào database bạn sử dụng, cài đặt thêm:
# MySQL
npm install mysql2 knex
# HOẶC MongoDB
npm install mongoose
# HOẶC PostgreSQL
npm install pg knex
```

## Thiết lập Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo một dự án mới hoặc chọn dự án hiện có
3. Vào mục "API & Services" > "Credentials"
4. Nhấn "Create Credentials" > "OAuth client ID"
5. Chọn loại ứng dụng (thường là "Web application")
6. Đặt tên cho client
7. Thêm URI chuyển hướng: `http://localhost:3000/auth/google/callback` (cho môi trường development)
8. Bấm "Create" và lưu lại Client ID và Client Secret

## Cấu trúc dự án

Tổ chức dự án theo cấu trúc rõ ràng giúp dễ dàng bảo trì và mở rộng:

```
project/
├── config/
│   ├── passport.js     # Cấu hình passport
│   └── keys.js         # Biến môi trường (hoặc .env)
├── controllers/
│   └── authController.js
├── routes/
│   └── authRoutes.js
├── services/
│   └── userService.js
├── middlewares/
│   └── auth.js
├── models/             # Tùy thuộc vào DB
│   └── User.js
├── db/                 # Khi sử dụng Knex
│   └── db.js
└── app.js              # Entry point
```

## Cấu hình Passport

Tạo file `config/passport.js`:

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userService = require('../services/userService');

module.exports = (app) => {
  // Xác định cách serialize dữ liệu user vào session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Xác định cách deserialize từ session thành user object
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userService.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Cấu hình Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Tìm user theo Google ID
          let user = await userService.findUserByGoogleId(profile.id);
          
          if (user) {
            return done(null, user);
          }
          
          // Nếu không tìm thấy, kiểm tra email
          const email = profile.emails?.[0].value;
          
          if (email) {
            user = await userService.findUserByEmail(email);
            
            if (user) {
              // Cập nhật Google ID cho user hiện có
              user = await userService.updateUserGoogleId(user.id, profile.id);
              return done(null, user);
            }
          }
          
          // Tạo user mới
          const newUser = {
            username: profile.displayName || `user_${Date.now()}`,
            email: email || '',
            google_id: profile.id,
            avatar: profile.photos?.[0]?.value
          };
          
          user = await userService.createUser(newUser);
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );

  // Khởi tạo passport trong app
  app.use(passport.initialize());
  app.use(passport.session());
};
```

## Tạo middleware xác thực

File `middlewares/auth.js`:

```javascript
module.exports = {
  // Middleware kiểm tra người dùng đã đăng nhập chưa
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  },
  
  // Middleware chuyển hướng người dùng đã đăng nhập
  forwardAuthenticated: (req, res, next) => {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/dashboard');
  },
  
  // Middleware kiểm tra vai trò (nếu cần)
  ensureRole: (role) => {
    return (req, res, next) => {
      if (req.user && req.user.role === role) {
        return next();
      }
      res.status(403).send('Không có quyền truy cập');
    };
  }
};
```

## Tạo service xử lý người dùng

Service này thích ứng với cơ sở dữ liệu của bạn. Dưới đây là ví dụ với Knex (MySQL/PostgreSQL):

```javascript
const db = require('../db/db');

module.exports.findById = async (id) => {
  return await db('user').where({ id }).first();
};

module.exports.findUserByGoogleId = async (googleId) => {
  return await db('user').where({ google_id: googleId }).first();
};

module.exports.findUserByEmail = async (email) => {
  return await db('user').where({ email }).first();
};

module.exports.createUser = async (userData) => {
  const [id] = await db('user').insert(userData);
  return await db('user').where({ id }).first();
};

module.exports.updateUserGoogleId = async (userId, googleId) => {
  await db('user').where({ id: userId }).update({ google_id: googleId });
  return await db('user').where({ id: userId }).first();
};
```

Ví dụ với Mongoose (MongoDB):

```javascript
const User = require('../models/User');

module.exports.findById = async (id) => {
  return await User.findById(id);
};

module.exports.findUserByGoogleId = async (googleId) => {
  return await User.findOne({ googleId });
};

module.exports.findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

module.exports.createUser = async (userData) => {
  const user = new User({
    username: userData.username,
    email: userData.email,
    googleId: userData.google_id,
    avatar: userData.avatar
  });
  await user.save();
  return user;
};

module.exports.updateUserGoogleId = async (userId, googleId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { googleId },
    { new: true }
  );
  return user;
};
```

## Tạo routes

File `routes/authRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated, forwardAuthenticated } = require('../middlewares/auth');

// Khởi tạo đăng nhập Google
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// Callback URL sau khi đăng nhập Google
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    // Chuyển hướng sau khi đăng nhập thành công
    res.redirect('/dashboard');
  }
);

// Đăng xuất
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Route login (hiển thị form đăng nhập)
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('login', {
    title: 'Đăng nhập'
  });
});

// Route dashboard (được bảo vệ)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', {
    user: req.user,
    title: 'Dashboard'
  });
});

module.exports = router;
```

## Tích hợp vào ứng dụng

File `app.js`:

```javascript
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Cấu hình session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Chỉ dùng HTTPS trong production
      maxAge: 24 * 60 * 60 * 1000 // 1 ngày
    }
  })
);

// Cấu hình Passport
require('./config/passport')(app);

// Routes
app.use('/', require('./routes/authRoutes'));

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
```

## Xử lý lỗi và bảo mật

1. **XSS Protection**: Express có thể sử dụng helmet để bảo vệ chống lại các cuộc tấn công XSS:

```bash
npm install helmet
```

Thêm vào file app.js:

```javascript
const helmet = require('helmet');
app.use(helmet());
```

2. **CSRF Protection**:

```bash
npm install csurf
```

Thêm vào app.js:

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);
```

3. **Rate Limiting** để ngăn chặn tấn công brute force:

```bash
npm install express-rate-limit
```

Thêm vào app.js:

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn 100 requests mỗi IP
  message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.'
});

app.use('/auth/', authLimiter);
```

## Các mẫu code phổ biến

### 1. Lưu URL trước khi đăng nhập để chuyển hướng sau khi đăng nhập

```javascript
// Middleware lưu URL trước khi redirect tới login
app.use((req, res, next) => {
  if (req.path !== '/auth/login' && req.path !== '/auth/google/callback' && !req.path.startsWith('/auth/google')) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});

// Trong callback Google
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const redirectUrl = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }
);
```

### 2. Liên kết tài khoản Google cho người dùng đã đăng nhập

```javascript
// Route để liên kết tài khoản Google
router.get('/connect/google', ensureAuthenticated, passport.authorize('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/connect/google/callback',
  ensureAuthenticated,
  passport.authorize('google', { failureRedirect: '/settings' }),
  (req, res) => {
    res.redirect('/settings');
  }
);
```

### 3. Hủy liên kết tài khoản Google

```javascript
router.get('/disconnect/google', ensureAuthenticated, async (req, res) => {
  try {
    // Đảm bảo người dùng có phương thức đăng nhập khác
    if (!req.user.local.email && !req.user.facebook) {
      req.flash('error', 'Bạn cần có phương thức đăng nhập khác trước khi hủy liên kết Google');
      return res.redirect('/settings');
    }
    
    await userService.disconnectGoogle(req.user.id);
    res.redirect('/settings');
  } catch (error) {
    res.status(500).send('Lỗi server');
  }
});
```

## Khắc phục sự cố

### 1. Lỗi "Failed to serialize user into session"

Kiểm tra lại hàm `passport.serializeUser()` và đảm bảo rằng:
- User object có thuộc tính `id`
- Không có lỗi trong quá trình truy vấn database

### 2. Lỗi "Failed to deserialize user from session"

Kiểm tra lại hàm `passport.deserializeUser()` và đảm bảo rằng:
- ID được lưu trong session có thể truy vấn được từ database
- Không có lỗi trong quá trình truy vấn database

### 3. Lỗi "Missing credentials"

Đảm bảo:
- CLIENT_ID và CLIENT_SECRET được cấu hình chính xác
- URL chuyển hướng khớp với cấu hình trong Google Console

### 4. Session không lưu trữ người dùng

Đảm bảo rằng:
- express-session được cấu hình trước khi khởi tạo passport
- Secret key đủ phức tạp và không thay đổi giữa các lần restart server

### 5. Lỗi CORS

Nếu bạn đang phát triển API riêng biệt:

```bash
npm install cors
```

```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
```

---

Tài liệu này cung cấp một hướng dẫn toàn diện về cách triển khai xác thực Google OAuth trong ứng dụng Express.js sử dụng Passport.js. Các nguyên tắc trong tài liệu này có thể được áp dụng cho nhiều dự án khác nhau, với bất kỳ cơ sở dữ liệu nào.
