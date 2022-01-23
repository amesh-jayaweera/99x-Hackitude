const dbConnection = require("../db/sqlite");
const userRepository = require("../repositories/userRepository");
const courseRepository = require("../repositories/courseRepository");

dbConnection
  .getDbConnection()
  .then((db) => {
    userRepository.init(db);
    courseRepository.init(db);
  })
  .catch((err) => {
    console.log(err);
    throw err;
  });

async function signInUser(email, password) {
  return userRepository
    .getUserByEmailAndPassword(email, password);
}

async function getUserSpecificDetailsWithId(id) {
  const noOfRecentCoursesToShow = 4;
  return new Promise(async (resolve, reject) => {
    try {
      const user = await userRepository.getUserById(id);
      const userCourses = await courseRepository.getUserCourses(id);
      const recentCourses = await courseRepository.getRecentCourses(
        noOfRecentCoursesToShow
      );
      let userGrade = '';
      const userGradeLogics = await courseRepository.getUserGrade(id);
      if(userGradeLogics.length > 0) {
        const userGradeLogic = userGradeLogics[0];
        if(userGradeLogic.totalScore != null && userGradeLogic.totalScore > 90)
          userGrade = 'Expert'
        else if(userGradeLogic.courseCount > 2 || (userGradeLogic.maxScore != null && userGradeLogic.maxScore > 0))
          userGrade = 'Beginner'
        else
          userGrade = 'Novice';
      }
      resolve((merged = { user, userCourses, recentCourses, userGrade }));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  signInUser,
  getUserSpecificDetailsWithId,
};
