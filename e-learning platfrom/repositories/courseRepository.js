const fetch = require("node-fetch");

let _db;

function init(db) {
  _db = db;
}

const knex_db = require('../db/db-config')

function getRecentCourses(count) {
  const sql = `SELECT * from courses ORDER BY id DESC LIMIT ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [count])
      .then((courses) => {
        resolve(courses);
      }).catch((error) => {
        reject(error)
      })
  });
}

function getAllCourses() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, title, level, description FROM courses`;
    knex_db
      .raw(sql)
      .then((courses) => {
        resolve(courses);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function getUserCourses(userID) {
  const sql = `SELECT * from userCourses WHERE uid = ?`;

  return new Promise((resolve, reject) => {

    knex_db.raw(sql, [userID])
      .then((courses) => {
        const injectedString = courses.map((c) => `'${c.cid}'`).join(", ");
        const sql2 = `SELECT courses.id, courses.title, userCourses.score, userCourses.progress, userCourses.last_resumed_date, userCourses.pinned FROM courses INNER JOIN userCourses WHERE id IN (${injectedString}) AND courses.id == userCourses.cid AND userCourses.uid = ?`;

        knex_db.raw(sql2, [userID])
          .then((courses) => {
            resolve(courses);
          }).catch((error) => {
            reject(error)
          })
      }).catch((error) => {
        reject(error)
      })
  });
}

function getSearchedCourses(userID, searchVal) {
  return new Promise((resolve, reject) => {

    const sql2 = `SELECT title, level FROM courses WHERE title LIKE ? OR description LIKE ?`;

    knex_db.raw(sql2, ['%'+searchVal + '%','%'+searchVal + '%'])
      .then((courses) => {
        resolve(courses);
      }).catch((error) => {
        reject(error)
      })
  });
}

function getSortedCourses(action, value) {
  let sql = `SELECT id, title, level FROM courses`;

  return new Promise((resolve, reject) => {
    if (action == "sort") {
      if (value == "name") {
        sql = `SELECT id, title, level FROM courses ORDER BY title`;
      } 
      if (value == "popularity") {
        sql = `SELECT userCourses.cid, COUNT(*) AS "num", courses.title, courses.level 
              FROM userCourses,courses 
              WHERE userCourses.cid = courses.id
              GROUP BY userCourses.cid ORDER BY num DESC`;
      } 
      knex_db
        .raw(sql)
        .then((courses) => {
          resolve(courses);
        })
        .catch((error) => {
          reject(error);
        });

    } else if (action == "filter") {
        sql = `SELECT id, title, level FROM courses WHERE level = ? ORDER BY title`;
        knex_db
          .raw(sql, [value])
          .then((courses) => {
            resolve(courses);
          })
          .catch((error) => {
            reject(error);
          });
    } else {
        knex_db
          .raw(sql)
          .then((courses) => {
            resolve(courses);
          })
          .catch((error) => {
            reject(error);
          });
    }
  });
}

function getCourseDetails(userId, courseId) {
  const sql = `SELECT id, title, level, description, price, duration FROM courses WHERE id = ?`;
  const sql2 = `SELECT uid FROM userCourses WHERE cid = ? AND uid = ?`;
  const sql3 = `SELECT u.name, c.review FROM (SELECT uid,review FROM userCourses WHERE cid = ? AND length(review) > 0)
    as c INNER JOIN users as u ON c.uid = u.id`;

  return new Promise(async (resolve, reject) => {
    let enrolled = "";
    var registeredCourses = await knex_db.raw(sql2, [courseId, userId]);
    if (registeredCourses.length > 0) {
      enrolled = "yes";
    } else {
      enrolled = "no";
    }

    knex_db.raw(sql, [courseId])
      .then(async (courses) => {
          let course = courses[0];
          const reviews = await knex_db.raw(sql3, [courseId]);
          resolve({course, enrolled, reviews});
      }).catch((error) => {
        reject(error)
      })
  });
}

function enrollInCourse(userId, courseId) {
  const sql = `INSERT INTO userCourses(cid,uid,score) VALUES(?,?,-1)`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [courseId, userId])
      .then(() => {
        resolve();
      }).catch((error) => {
        reject(error)
      })
  });
}

function getCourseContentDetails(courseId) {
  const sql = `SELECT id, title, level, description FROM courses WHERE id = ?`;
  const sql1 = `SELECT description , id FROM chapters WHERE cid = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [courseId])
      .then((course_data) => {
        knex_db.raw(sql1, [courseId])
          .then((chapters_data) => {
            let course = course_data[0];
            let chapters = chapters_data;
            resolve({ course, chapters });
          }).catch((error) => {
            reject(error)
          })
      }).catch((error) => {
        reject(error)
      })
  });
}

function resetEnrolledCourses(userId) {
  const sql = `DELETE FROM userCourses WHERE uid = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [userId])
      .then(() => {
        resolve();
      }).catch((error) => {
        reject(error)
      })
  });
}

function disenrollCourse(userId,courseId) {
  const sql = `DELETE FROM userCourses WHERE uid = ? AND cid = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [userId,courseId])
      .then(() => {
        resolve();
      }).catch((error) => {
        reject(error)
      })
  });
}

function getCourseMcq(courseId) {
  const sql1 = `SELECT qid FROM courseQuestions WHERE cid = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql1, [courseId])
      .then((data) => {
        const injectedString = data.map((c) => `'${c.qid}'`).join(", ");
        const sql2 = `SELECT qid, questions FROM mcqQuestions WHERE qid IN (${injectedString}) `;

        knex_db.raw(sql2)
          .then((questions) => {
            const injectedString = data.map((c) => `'${c.qid}'`).join(", ");
            const sql3 = `SELECT qid, answer, aid FROM mcqAnswers WHERE qid IN (${injectedString})`;

            knex_db.raw(sql3)
              .then((answers) => {
                resolve({ questions, answers });
              }).catch((error) => {
                reject(error)
              })
          }).catch((error) => {
            reject(error)
          })
      }).catch((error) => {
        reject(error)
      })
  });
}

function setCourseScore(courseId, userId, ans1, ans2, ans3) {
  const sql1 = `SELECT qid FROM courseQuestions WHERE cid = ?`;
  const sql3 = `UPDATE userCourses SET score = ? WHERE (cid = ? AND uid = ?)`;
  const sql4 = `SELECT score FROM userCourses WHERE (cid = ? AND uid = ?)`;
  const sql5 = `SELECT cid, avg(score) as avg
                FROM userCourses
                WHERE cid = ? and score !=-1
                GROUP BY cid`
                
  let score = 0;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql1, [courseId])
      .then((data) => {
        const injectedString = data.map((q) => `'${q.qid}'`).join(", ");
        const sql2 = `SELECT aid FROM correctAnswers WHERE qid IN (${injectedString})`;

        knex_db.raw(sql2)
          .then((data) => {

            if (ans1 == Object.values(data[0])) {
              score = score + 10;
            }
            if (ans2 == Object.values(data[1])) {
              score = score + 10;
            }
            if (ans3 == Object.values(data[2])) {
              score = score + 10;
            }

            knex_db.raw(sql3, [score, courseId, userId])
              .then(() => {
                knex_db.raw(sql4, [courseId, userId])
                  .then(() => {
                    knex_db.raw(sql5, [courseId])
                      .then((avg )=> {
                        resolve({
                          score: score,
                          avg: avg
                        });

                      }).catch((error) =>{
                        reject(error)
                      })

                  }).catch((error) => {
                    reject(error)
                  })

              }).catch((error) => {
                reject(error)
              })

          }).catch((error) => {
            reject(error)
          })
      }).catch((error) => {
        reject(error)
      })
  });
}

function getUserGrade(userID) {

    const sql = `SELECT count(cid) as courseCount, max(score) as maxScore, sum(score) as totalScore from userCourses WHERE  uid = ?`;

    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [userID])
            .then((courses) => {
                resolve(courses)
            }).catch((error) => {
            reject(error)
        })
    });
}

function getPopularCourses() {

  const sql = `SELECT userCourses.cid, COUNT(*) AS nEnrolled, courses.title, courses.level 
  FROM userCourses,courses 
  WHERE userCourses.cid = courses.id
  GROUP BY userCourses.cid ORDER BY nEnrolled DESC`;

  return new Promise((resolve, reject) => {
      knex_db.raw(sql)
          .then((popularCourses) => {
              resolve(popularCourses)
          }).catch((error) => {
          reject(error)
      })
  });
}

function getUserCourseStatus(userID, courseID) {
    const sql = `SELECT score from userCourses WHERE uid = ? AND cid = ?`;

    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [userID, courseID])
            .then((courses) => {
                resolve(courses)
            }).catch((error) => {
            reject(error)
        })
    });
}

function updateLastAccessed(userID, courseID) {
  const sql = `UPDATE userCourses
  SET last_resumed_date = DATE('now')
  WHERE uid = ? AND cid = ?`;

  return new Promise((resolve, reject) => {
      knex_db.raw(sql, [userID, courseID])
          .then(() => {
              resolve()
          }).catch((error) => {
          reject(error)
      })
  });
}
function updateReview(userID,courseID,review) {
    const sql = `UPDATE userCourses SET review = ? WHERE uid = ? AND cid = ?`;
    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [review, userID, courseID])
            .then(() => {
                resolve()
            }).catch((error) => {
            reject(error)
        })
    });
}

function getAllCoursesCount() {
    const sql = `SELECT count(*) as courseCount FROM courses`;
    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [])
            .then((count) => {
                resolve(count[0]['courseCount'])
            }).catch((error) => {
            reject(error)
        })
    });
}

function  getNumberOfEnrollmentsForGivenCourse(cid) {
    const sql = `SELECT count(*) as enrollmentCount FROM userCourses WHERE cid = ?`;
    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [cid])
            .then((enrollmentCount) => {
                resolve(enrollmentCount[0]['enrollmentCount'])
            }).catch((error) => {
            reject(error)
        })
    });
}

function updateCourseProgress(userId,courseId,progress){
  const sql = `UPDATE userCourses SET progress=? WHERE cid = ? AND uid = ?`;
  return new Promise((resolve, reject) => {
      knex_db.raw(sql, [progress,courseId,userId])
          .then(() => {
              resolve()
          }).catch((error) => {
          reject(error)
      })
  });
}

function  getGivenNumberOfTopCoursesByNumberOfEnrollments(topCount) {
    const sql = `SELECT cid FROM userCourses GROUP BY cid ORDER BY COUNT(cid) DESC LIMIT ?`;
    return new Promise((resolve, reject) => {
        knex_db.raw(sql, [topCount])
            .then((topCourses) => {
                let courseIds = [];
                for(let i=0;i<topCourses.length;i++) {
                    courseIds.push(topCourses[i]['cid']);
                }
                resolve(courseIds)
            }).catch((error) => {
            reject(error)
        })
    });
}

function setPinned(userId, courseId) {
  const sql = `UPDATE userCourses
              SET pinned = NOT pinned
              WHERE uid = ? AND cid = ?`;

  return new Promise((resolve, reject) => {
      knex_db.raw(sql, [userId, courseId])
          .then(() => {
              resolve()
          }).catch((error) => {
          reject(error)
      })
  });
}

module.exports = {
    getGivenNumberOfTopCoursesByNumberOfEnrollments,
    getNumberOfEnrollmentsForGivenCourse,
    getAllCoursesCount,
    updateReview,
    getUserCourseStatus,
    getUserGrade,
  getAllCourses,
  getUserCourses,
  getSearchedCourses,
  getSortedCourses,
  getCourseDetails,
  enrollInCourse,
  getCourseContentDetails,
  resetEnrolledCourses,
  getCourseMcq,
  setCourseScore,
  getRecentCourses,
  disenrollCourse,
  getPopularCourses,
  updateLastAccessed,
  updateCourseProgress,
  init,
  setPinned,
};
