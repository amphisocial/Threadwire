const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => !/^\s/.test(value),
      message: 'First name cannot start with a space'
    }
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => !/^\s/.test(value),
      message: 'Last name cannot start with a space'
    }
  },
  userName: {
    type: String,
    required: function () { return !this.googleId; },
    unique: true,
    trim: true,
    validate: {
      validator: (value) => /^[a-zA-Z0-9]+$/.test(value),
      message: 'Username can only contain alphabets and numbers, and cannot start with a space'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: function () { return !this.googleId; },
    validate: {
      validator: (value) => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[\S]{8,}$/.test(value),
      message: 'Password must have at least 8 characters, one capital letter, one special character, one number, and no spaces'
    }
  },
  phone: {
    type: String,
    required: function () { return !this.googleId; },
    unique: true,
    validate: {
      validator: function(value) {
        return /^\+\d{1,3}\d{10}$/.test(value);
      },
      message: 'Phone number must include country code (+XX) followed by 10 digits'
    }
  },
  googleId: { type: String, unique: true, sparse: true },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function () { return !this.googleId; }
  },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null },
}, { timestamps: true });

userSchema.virtual('confirmPassword')
  .set(function (value) {
    this._confirmPassword = value;
  })
  .get(function () {
    return this._confirmPassword;
  });

userSchema.pre('save', function (next) {
  if (this._confirmPassword && this.password !== this._confirmPassword) {
    return next(new Error('Passwords do not match'));
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;