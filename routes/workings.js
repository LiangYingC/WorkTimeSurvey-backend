var express = require('express');
var router = express.Router();
var cors = require('./cors');
var HttpError = require('./errors').HttpError;
var facebook = require('../libs/facebook');
var winston = require('winston');

router.use(cors);

/*
 * Show the newest company, week_work_time, job_title
 * GET /
 * [page = 0]
 */
router.get('/latest', function(req, res, next) {
    var page = req.query.page || 0;
    var limit = req.query.limit || 25;

    limit = parseInt(limit);
    if (isNaN(limit) || limit > 50) {
        throw new HttpError("limit is not allow");
    }

    var collection = req.db.collection('workings');
    var q = {};
    var opt = {
            company: 1,
            week_work_time: 1,
            job_title: 1,
            created_at: 1,
        };
    collection.find(q, opt).sort({created_at: -1}).skip(limit * page).limit(limit).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

/*
 *  When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {

router.post('/', function(req, res, next) {
    var access_token = req.body.access_token;

    facebook.access_token_auth(access_token).then(function(facebook) {
        winston.info("facebook auth success", {access_token: access_token});

        req.facebook = facebook;
        next();
    }).catch(function(err) {
        winston.info("facebook auth fail", {access_token: access_token});

        next(new HttpError("Unauthorized", 401));
    });
});

}

/*
 * POST /
 * company_id | company_name
 * job_title: string
 * week_work_time: integer
 * [salary_min]
 * [salary_max]
 * [salary_type]: suggest "hour", "month", "year"
 * [work_year]
 * [review]
 */
router.post('/', function(req, res, next) {
    /*
     * Prepare and collect the data from request
     */
    var author = {};

    if (req.body.email && (typeof req.body.email === "string") && req.body.email !== "") {
        author.email = req.body.email;
    }

    if (req.facebook) {
        author.id = req.facebook.id,
        author.name = req.facebook.name,
        author.type = "facebook";
    } else {
        author.id = "-1";
        author.type = "test";
    }

    var data = {
        author: author,
        company: {},
        created_at: new Date(),
    };

    // pick these fields only
    // make sure the field is string
    [
        "job_title", "week_work_time",
        "overtime_frequency",
        "day_promised_work_time", "day_real_work_time",
    ].forEach(function(field, i) {
        if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
            data[field] = req.body[field];
        }
    });
    if (req.body.company_id && (typeof req.body.company_id === "string") && req.body.company_id !== "") {
        data.company.id = req.body.company_id;
    }
    if (req.body.company_name && (typeof req.body.company_name === "string") && req.body.company_name !== "") {
        data.company.name = req.body.company_name;
    }

    /*
     * Check all the required fields, or raise an 422 http error
     */
    try {
        validateWorking(data);
    } catch (err) {
        winston.info("workings insert data fail", data);

        next(err);
        return;
    }

    /*
     * So, here, the data are well-down
     */

    var collection = req.db.collection("workings");
    var companyCollection = req.db.collection("companies");

    // use company id to search company
    function searchCompanyById(id) {
        return companyCollection.find({
            id: id,
        }).toArray();
    }

    // use company name to search company
    function searchCompanyByName(name) {
        return companyCollection.find({
            name: name,
        }).toArray();
    }

    Promise.resolve(data).then(function(data) {
        console.log("autocompletion company");
        /*
         * 如果使用者有給定 company id，將 company name 補成查詢到的公司
         *
         * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
         *
         * 其他情況看 issue #7
         */
        if (data.company.id) {
            return searchCompanyById(data.company.id).then(function(results) {
                if (results.length === 0) {
                    throw new HttpError("公司統編不正確", 429);
                }

                data.company.name = results[0].name;
                return data;
            });
        } else {
            return searchCompanyByName(data.company.name).then(function(results) {
                if (results.length === 1) {
                    data.company.id = results[0].id;
                    return data;
                } else {
                    return data;
                }
            });
        }
    }).then(function(data) {
        return checkQuota(req.db, {id: data.author.id, type: data.author.type}).then(function() {
            return data;
        });
    }).then(function(data) {
        return collection.insert(data);
    }).then(function(result) {
        winston.info("workings insert data success", data);

        res.send(data);
    }).catch(function(err) {
        winston.info("workings insert data fail", data);

        next(err);
    });
});

function validateWorking(data) {
    if (! data.job_title) {
        throw new HttpError("職稱未填", 422);
    }

    if (! data.week_work_time) {
        throw new HttpError("最近一週實際工時未填", 422);
    }
    data.week_work_time = parseInt(data.week_work_time);
    if (isNaN(data.week_work_time)) {
        throw new HttpError("最近一週實際工時必須是數字", 422);
    }
    if (data.week_work_time < 0 || data.week_work_time > 168) {
        throw new HttpError("最近一週實際工時必須在0~168之間", 422);
    }

    if (! data.overtime_frequency) {
        throw new HttpError("加班頻率必填", 422);
    }
    if (["0", "1", "2", "3"].indexOf(data.overtime_frequency) === -1) {
        throw new HttpError("加班頻率格式錯誤", 422);
    }
    data.overtime_frequency = parseInt(data.overtime_frequency);

    if (! data.day_promised_work_time) {
        throw new HttpError("工作日表訂工時未填", 422);
    }
    data.day_promised_work_time = parseInt(data.day_promised_work_time);
    if (isNaN(data.day_promised_work_time)) {
        throw new HttpError("工作日表訂工時必須是數字", 422);
    }
    if (data.day_promised_work_time < 0 || data.day_promised_work_time > 24) {
        throw new HttpError("工作日表訂工時必須在0~24之間", 422);
    }

    if (! data.day_real_work_time) {
        throw new HttpError("工作日實際工時必填", 422);
    }
    data.day_real_work_time = parseInt(data.day_real_work_time);
    if (isNaN(data.day_real_work_time)) {
        throw new HttpError("工作日實際工時必須是數字", 422);
    }
    if (data.day_real_work_time < 0 || data.day_real_work_time > 24) {
        throw new HttpError("工作日實際工時必須在0~24之間", 422);
    }

    if (! (data.company.id || data.company.name)) {
        throw new HttpError("公司/單位名稱 或 統一編號其中一個必填", 422);
    }
}

/*
 * Check the quota, limit queries <= 10
 *
 * The quota checker use author as _id
 *
 * @return  Promise
 *
 * Fullfilled with newest queries_count
 * Rejected with HttpError
 */
function checkQuota(db, author) {
    var collection = db.collection('authors');

    return collection.findAndModify(
        {
            _id: author,
            queries_count: {$lt: 10},
        },
        [
        ],
        {
            $inc: { queries_count: 1 },
        },
        {
            upsert: true,
            new: true,
        }
    ).then(function(result) {
        if (result.value.queries_count > 10) {
            throw new HttpError("已超過您可以上傳的次數", 429);
        }

        return result.value.queries_count;
    }).catch(function(err) {
        throw new HttpError("已超過您可以上傳的次數", 429);
    });

}

module.exports = router;
