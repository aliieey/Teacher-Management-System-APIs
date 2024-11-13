const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const secret = "Abc123abc";

app.use(cors());
app.use(express.json());

// Middleware for authentication
function authenticate(req, res, next) {
  const token = req.headers.token;

  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send("Invalid token");
  }
}

async function connection() {
  try {
    await mongoose.connect("mongodb://localhost:27017/Teacher", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Yes, MongoDB is connected");
  } catch (error) {
    console.log("It's not connecting", error);
  }
}

connection();

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 2,
  },
});

const Teacher = mongoose.model("Teacher", teacherSchema);

// Student Schema
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  batch: {
    type: String,
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher", // Reference to the Teacher model
    required: true,
  },
});

const Student = mongoose.model("Student", studentSchema);

// Signup route
app.post("/signup", async (req, res) => {
  const teacherData = req.body;
  try {
    const newTeacher = new Teacher(teacherData);
    await newTeacher.save();
    res.status(201).send("User signed up successfully");
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(400).send("Error signing up user: " + error.message);
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await Teacher.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (user.password !== password) {
      return res.status(401).send("Invalid password");
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, secret);

    res.status(200).json({
      message: "User logged in successfully",
      token: token,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(400).send("Error logging in user: " + error.message);
  }
});

// Create a student route
app.post("/create-student", authenticate, async (req, res) => {
  const { name, dob, course, batch} = req.body;

  const teacherId = req.user.id;
//   console.log(teacherId);
  try {
    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).send("Teacher not found");
    }

    // Create new student
    const newStudent = new Student({
      name,
      dob,
      course,
      batch,
      teacher: teacherId,
    });

    await newStudent.save();
    res.status(201).json({
        message: "Student created successfully",
        student : newStudent
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(400).send("Error creating student: " + error.message);
  }
});

// Get students of a specific teacher route
app.get("/teacher/:teacherId/students", authenticate, async (req, res) => {
  const { teacherId } = req.params;
  try {
    // Find students associated with the teacher
    const students = await Student.find({ teacher: teacherId });
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(400).send("Error fetching students: " + error.message);
  }
});

// Protected route
app.get("/protected", authenticate, (req, res) => {
  res.status(200).json({
    message: "This is a protected route",
    user: req.user, // Decoded user info
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
