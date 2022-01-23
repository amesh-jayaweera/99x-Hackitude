const dbConnection = require('../db/sqlite');
const courseRepository = require('../repositories/courseRepository');
let fetch = require('node-fetch');

dbConnection
    .getDbConnection()
    .then((db) => {
        courseRepository.init(db);
    })
    .catch((err) => {
        console.log(err);
        throw err;
    });

async function allCourses(userId) {
    const courses = await courseRepository.getAllCourses(userId);
    const courseCount = await courseRepository.getAllCoursesCount();
    const top20 = Math.ceil(courseCount * 0.2);
    const top20CourseIds = await courseRepository.getGivenNumberOfTopCoursesByNumberOfEnrollments(top20);
    for(let i=0;i<courses.length;i++) {
        const score = await courseRepository.getUserCourseStatus(userId, courses[i].id);
        courses[i].isPopular = false;
        if(score.length == 0) {
            courses[i].status = 'Not Enrolled';
        } else if(score[0].score > -1) {
            courses[i].status = 'Completed';
        } else {
            courses[i].status = 'Enrolled';
        }
        if(top20CourseIds.includes(courses[i].id)) {
            courses[i].isPopular = true;
        }
    }
    return courses;
}

async function userCourses(userId) {
    const courses = courseRepository.getUserCourses(userId);
    return courses;
}

async function searchedCourses(userId, searchVal) {
    return new Promise(async (resolve, reject) => {
        try {
            resolve(await courseRepository.getSearchedCourses(userId, searchVal));
        } catch (error) {
            reject(error)
        }
    })
}

async function sortedCourses(action, value) {
    const courses = courseRepository.getSortedCourses(action, value);
    return courses;
}

async function courseDetails(userId, courseId) {
    const courses = courseRepository.getCourseDetails(userId, courseId);
    return courses;
}

async function courseEnroll(userId, courseId) {
    const courses = courseRepository.enrollInCourse(userId, courseId);
    return courses;
}

async function courseContentDetails(userId, courseId) {
    const courses = courseRepository.getCourseContentDetails(userId, courseId);
    return courses;
}

async function resetCourses(userId) {
    const courses = courseRepository.resetEnrolledCourses(userId);
    return courses;
}

async function courseMcq(courseId) {
    const courseMcq = courseRepository.getCourseMcq(courseId);
    return courseMcq;
}

async function courseScore(courseId, userId, ans1, ans2, ans3) {
    const courseScore = courseRepository.setCourseScore(courseId, userId, ans1, ans2, ans3);
    return courseScore;
}

async function disEnrollCourse(courseId, userId) {
    await courseRepository.disenrollCourse(userId,courseId);
}

async function popularCourses() {
    const courses = await courseRepository.getPopularCourses();
    return courses
}

async function updateLastAccessed(userId,courseId) {
    const courses = await courseRepository.updateLastAccessed(userId,courseId);
    return courses
}

async function getTopFiveSuggestionsFromGoogleApi(bookTitle) {
    // get googleApiKey
    const googleApiKey = "";
    const firstWord = bookTitle.split(' ')[0];
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${firstWord}&printType=books&maxResults=5&key=${googleApiKey}`);
    const books =  await response.json();
    const items = books['items'];
    const suggestedBooks = [];
    for(let i=0;i<items.length;i++) {
        suggestedBooks.push(items[i]['volumeInfo']['title']);
    }
    return suggestedBooks;
}

async function getCoursePrice(currencyTo, value) {
    const today = new Date();
    let firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    // get from env
    const apiKey = '';
    const api = `https://openexchangerates.org/api/historical/${firstDay}.json?app_id=${apiKey}`;
    const response = await fetch(api);
    const responseJson =  await response.json();
    const rates = responseJson['rates'];
    return value * rates[currencyTo];
}

async function setPinned(userId, courseId) {
    await courseRepository.setPinned(userId,courseId);
}

module.exports = {
    getCoursePrice,
    getTopFiveSuggestionsFromGoogleApi,
    allCourses,
    userCourses,
    searchedCourses,
    sortedCourses,
    courseDetails,
    courseEnroll,
    courseContentDetails,
    resetCourses,
    courseMcq,
    courseScore,
    disEnrollCourse,
    popularCourses,
    updateLastAccessed,
    setPinned
}