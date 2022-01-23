const express = require("express");
const router = express.Router();
const courseService = require("../services/courseService");
const courseRepository = require("../repositories/courseRepository");
const userRepository = require("../repositories/userRepository");
const {getSortOrder} = require("../utils/Helper");

router.get("/allcourses", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  }
  const courses = await courseService.allCourses(userId);
  res.render(
    "all-courses.ejs",
    { allcourses: courses, userId: userId },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
  
});

router.get("/enrolled", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const userCourses = await courseService.userCourses(userId);
  res.render(
    "enrolled.ejs",
    { courses: userCourses, userId: userId },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.post("/search", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const searchVal = req.body.searchVal;
  courseService
    .searchedCourses(userId, searchVal)
    .then((data) => {
      res.render(
        "all-courses.ejs",
        { allcourses: data, userId: userId },
        (error, ejs) => {
          if (error) {
            console.log(error);
            res.render("error.ejs", { message: "EJS" });
          } else {
            res.send(ejs);
          }
        }
      );
    })
    .catch((error) => {
      console.log(error);
      res.render("error.ejs", { message: "Server" });
    });
});

router.get("/sort", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const criteria = req.query.criteria;
  if (!criteria || criteria.indexOf("_") < 0) {
    res.render("error.ejs", {
      message: "Sort criteria must be available and should contain '_' in it",
    });
  } else {
    const action = criteria.split("_")[0];
    const value = criteria.split("_")[1];
    const sortedCourses = await courseService.sortedCourses(action, value);
    res.render(
      "all-courses.ejs",
      { allcourses: sortedCourses, userId: userId },
      (error, ejs) => {
        if (error) {
          console.log(error);
          res.render("error.ejs", { message: "EJS" });
        } else {
          res.send(ejs);
        }
      }
    );
  }
  
});

router.get("/dashboard", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  }
  const courseId = req.query.courseId;
  const courseDetails = await courseService.courseDetails(userId, courseId);
  const suggestedBooks = await courseService.getTopFiveSuggestionsFromGoogleApi(courseDetails.course.title);
  const currencyLabel = await  userRepository.getUserCurrency(userId);
  const coursePrice = await courseService.getCoursePrice(currencyLabel, courseDetails.course.price);
  res.render(
    "course-dashboard.ejs",
    {
      title: courseDetails.course.title,
      level: courseDetails.course.level,
      duration: courseDetails.course.duration, 
      description: courseDetails.course.description,
      id: courseDetails.course.id,
      back: "req.query.paramB",
      enrolled: courseDetails.enrolled,
      nEnrolled: await courseRepository.getNumberOfEnrollmentsForGivenCourse(courseId),
      books: "books",
      price: coursePrice.toFixed(2),
      reviews: courseDetails.reviews,
      suggestedBooks : suggestedBooks,
      currencyLabel : currencyLabel
    },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.get("/enroll", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const courseId = req.query.courseId;
  await courseService.courseEnroll(userId, courseId);
  const userCourses = await courseService.userCourses(userId);
  res.render(
    "enrolled.ejs",
    { courses: userCourses, userId: userId },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.get("/disenroll", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const courseId = req.query.courseId;
  await courseService.disEnrollCourse(courseId,userId)
  res.redirect(`/course/dashboard?courseId=${courseId}`);
});

router.get("/coursePage", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const courseId = req.query.courseId;
  await courseService.updateLastAccessed(userId,courseId)
  const courseContent = await courseService.courseContentDetails(courseId);
  const wordsPerSecond = [4,4.2,4.41]
  let readingTimes = [];
  
  for(let i=0;i<courseContent.chapters.length;i++){
    var wordCount = courseContent.chapters[i].description.split(" ").length;    
    let roughReadingTime = wordCount/wordsPerSecond[i]
    readingTimes.push(Math.round(roughReadingTime))
  }

  res.render(
    "course-page.ejs",
    {
      chapters: courseContent.chapters,
      readingTimes,
      title: courseContent.course.title,
      level: courseContent.course.level,
      description: courseContent.course.description,
      id: courseContent.course.id,
      back: "req.query.paramB",
    },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.get("/reset", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  await courseService.resetCourses(userId);
  const userCourses = await courseService.userCourses(userId);
  
  res.render(
    "enrolled.ejs",
    { courses: userCourses, userId: userId },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.get("/mcq/:id", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const courseId = req.params.id;
  const courseMcq = await courseService.courseMcq(courseId);
  res.render(
    "mcq.ejs",
    { que: courseMcq.questions, answer: courseMcq.answers, id: courseId },
    (error, ejs) => {
      if (error) {
        console.log(error);
        res.render("error.ejs", { message: "EJS" });
      } else {
        res.send(ejs);
      }
    }
  );
});

router.post("/scores/:id", async (req, res) => {
  const courseId = req.params.id;
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const ans1 = req.body.q0_answer;
  const ans2 = req.body.q1_answer;
  const ans3 = req.body.q2_answer;
  const courseScore = await courseService.courseScore(
    courseId,
    userId,
    ans1,
    ans2,
    ans3
  );
  res.render("scores.ejs", { 
    score: courseScore.score, 
    avg: Math.round(courseScore.avg[0]['avg'])}
    , (error, ejs) => {
    if (error) {
      console.log(error);
      res.render("error.ejs", { message: "EJS" });
    } else {
      res.send(ejs);
    }
  });
});

router.post("/review/:cid", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/");
    return;
  } 
  const courseId = req.params.cid;
  const review = req.body.user_review;
  await courseRepository.updateReview(userId, Number(courseId), review);
  res.redirect(`/course/dashboard?courseId=${courseId}`);
});

router.get("/pin/:cid", async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      res.redirect("/");
      return;
    }
  const courseId = req.params.cid;
  //TODO implement the logic
  await courseService.setPinned(userId, courseId)
  res.redirect(`/course/dashboard?courseId=${courseId}`);
});

router.get("/updateProgress/:courseId/:progress", async (req, res) => {
  const userId = req.session.userId;
  const courseId = req.params.courseId
  const progress = req.params.progress;

  await courseRepository.updateCourseProgress(userId,courseId,progress)
  res.redirect(`/course/coursePage?courseId=${courseId}`);
});

router.get("/getHacktitudeCourses", async (req, res) => {
  const courses = await courseRepository.getAllCourses();
  const maxResults = req.query.maxResults
  const title = req.query.title;
  courses.sort(getSortOrder("title"))
  let formattedCourses = courses.map(course => (
    {
      title: course.title,
      description: course.description
    }
  ))
  if (title) {
    formattedCourses = formattedCourses.filter(course => course.title.includes(title))
  }
  if (maxResults){
    formattedCourses = formattedCourses.slice(0,maxResults)
  }
  res.json({courses : formattedCourses});
});

module.exports = router;
