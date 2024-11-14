const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 8000;
const Secret = "abc123ABC@#$";
app.use(cors());
app.use(express.json());

function generateRandomPassword() {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  for (let i = 0; i < 7; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }

  return password;
}
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "infoaliraza22@gmail.com", // Replace with your email
    pass: "ievm lijm hsex xjkc", // Replace with your email password or app-specific password
  },
});

function Authenticate(req, res, next) {
  const token = req.headers.token;
  if (!token) {
    return res.status(401).send("There is no token");
  }
  try {
    const decodedata = jwt.verify(token, Secret);
    req.user = decodedata;
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

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  batch: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
  },
});
const Student = mongoose.model("Student", studentSchema);

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
  },
});

const Course = mongoose.model("Course", courseSchema);

app.post("/signup", async (req, res) => {
    const teacherData = req.body;
    try {
      await Teacher.create(teacherData);
      res.status(201).send("User signed up successfully");
    } catch (error) {
      console.error("Error saving user:", error);
      res.status(400).send("Error signing up user: " + error.message);
    }
  });

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await Teacher.findOne({ email });
    if (!user) {
      return res.status(404).send("Student not found");
    }
    if (user.password !== password) {
      return res.status(401).send("Invalid password");
    }

    const token = jwt.sign(
      { email: user.email, password: password, id: user._id },
      Secret
    );
    res.status(200).json({
      message: "Teacher is logged in",
      token: token,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(400).send("Error logging in user: " + error.message);
  }
});


app.post("/create-student", Authenticate, async (req, res) => {
    const { name, email, dob, batch } = req.body;
    const teacherId = req.user.id;
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return res.status(404).send("Teacher not found");
      }
  
      const generatedPassword = generateRandomPassword();
  
      await Student.create({
        name,
        email,
        dob,
        batch,
        password: generatedPassword,
        teacher: teacherId,
      });
  
      const mailOptions = {
        from: "infoaliraza22@gmail.com",
        to: email,
        subject: "Welcome to the Course!",
        text: `Hello ${name},\n\nYour account has been created successfully.\nYour login password is: ${generatedPassword}\n\nPlease keep it safe.\n\nBest regards`,
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          return res
            .status(500)
            .send("Error creating student and sending email: " + error.message);
        }
        res.status(201).send("Student created and email sent successfully.");
      });
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).send("Error creating student: " + error.message);
    }
  });


  app.post("/loginstudent", async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await Student.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found");
        }
        if (user.password !== password) {
            return res.status(401).send("Invalid password");
        }
        const token = jwt.sign({ email: user.email,password:password,id:user._id }, Secret);
        res.status(200).json({
            message: "Student is logged in",
            token: token
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(400).send("Error logging in user: " + error.message);
    }
});


app.post("/student/:studentId/update", Authenticate, async (req, res) => {
    const { studentId } = req.params;
    const { name, email, dob, batch, password } = req.body;
  
    try {
      const teacherId = req.user.id;
  
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).send("Student not found");
      }
  
      if (student.teacher != teacherId) {
        return res
          .status(403)
          .send("You do not have permission to update this student");
      }
  
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (dob) updateData.dob = dob;
      if (batch) updateData.batch = batch;
      if (password) updateData.password = password;
  
      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );
  
      res
        .status(200)
        .json({
          message: "Student updated successfully",
          student: updatedStudent,
        });
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).send("Error updating student: " + error.message);
    }
  });


  app.delete("/student/:studentId/delete", Authenticate, async (req, res) => {
    const { studentId } = req.params;
  
    try {
      const teacherId = req.user.id;
  
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).send("Student not found");
      }
  
      if (student.teacher.toString() !== teacherId) {
        return res
          .status(403)
          .send("You do not have permission to delete this student");
      }
  
      await Student.findByIdAndDelete(studentId);
  
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).send("Error deleting student: " + error.message);
    }
  });


  app.get("/teacher/:teacherId/students", Authenticate, async (req, res) => {
    const { teacherId } = req.params;
    try {
      const students = await Student.find({ teacher: teacherId });
      res.status(200).json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(400).send("Error fetching students: " + error.message);
    }
  });


  app.post("/create-course", Authenticate, async (req, res) => {
    const { name, author } = req.body;
    const studentId = req.user.id;
    try {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).send("Student not found");
      }
  
      await Course.create({
        name,
        author,
        studentId,
      });
  
      res.status(200).send("Course created");
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(400).send("Error creating course: " + error.message);
    }
  });

app.post("/course/:courseId/update", Authenticate, async (req, res) => {
  const { courseId } = req.params;
  const { name, author } = req.body;

  try {
    const studentId = req.user.id;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).send("course not found");
    }

    if (course.studentId != studentId) {
      return res
        .status(403)
        .send("You do not have permission to update this course");
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (author) updateData.author = author;

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Course updated successfully", student: updatedCourse });
  } catch (error) {
    console.error("Error updating Course:", error);
    res.status(500).send("Error updating Course: " + error.message);
  }
});



app.delete("/course/:courseId/delete", Authenticate, async (req, res) => {
  const { courseId } = req.params;

  try {
    const studentId = req.user.id;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).send("Course not found");
    }

    if (course.studentId != studentId) {
      return res
        .status(403)
        .send("You do not have permission to delete this course");
    }

    await Course.findByIdAndDelete(courseId);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).send("Error deleting student: " + error.message);
  }
});


app.get("/student/courses", Authenticate, async (req, res) => {
  const studentId = req.user.id;
  console.log(studentId);
  try {
    const courses = await Course.find({ studentId: studentId });
    res.status(200).json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(400).send("Error fetching courses: " + error.message);
  }
});

app.get("/protected", Authenticate, (req, res) => {
  res.status(200).json({
    message: "This is a protected route",
    user: req.user,
  });
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
