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
    required: true, 
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
    required: true,
    validate: {
      validator: (value) => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[\S]{8,}$/.test(value),
      message: 'Password must have at least 8 characters, one capital letter, one special character, one number, and no spaces'
    }
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: (value) => /^\d{10}$/.test(value),
      message: 'Phone number must be exactly 10 digits'
    }
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  }
}, { timestamps: true });

userSchema.virtual('confirmPassword')
  .set(function(value) {
    this._confirmPassword = value;
  })
  .get(function() {
    return this._confirmPassword;
  });

userSchema.pre('save', function(next) {
  if (this._confirmPassword && this.password !== this._confirmPassword) {
    return next(new Error('Passwords do not match'));
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;