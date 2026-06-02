import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      // Optional to make room for future Google login (OAuth users do not have local passwords)
      required: function() {
        return !this.googleId;
      },
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple users without googleId to exist without unique conflicts
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
