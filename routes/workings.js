const express = require('express');

const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const escapeRegExp = require('lodash/escapeRegExp');
const post_helper = require('./workings_post');
const middleware = require('./middleware');
const authentication = require('../middlewares/authentication');

router.get('/', middleware.sort_by);
router.get('/', middleware.pagination);
router.get('/', (req, res, next) => {
    const collection = req.db.collection('workings');
    const opt = {
        company: 1,
        sector: 1,
        created_at: 1,
        job_title: 1,
        data_time: 1,
        week_work_time: 1,
        overtime_frequency: 1,
        salary: 1,
        estimated_hourly_wage: 1,
    };

    let query = {
        [req.custom.sort_by]: { $exists: true },
    };
    const page = req.pagination.page;
    const limit = req.pagination.limit;

    const data = {};
    collection
        .count()
        .then((count) => {
            data.total = count;

            return collection
                .find(query, opt)
                .sort(req.custom.sort)
                .skip(limit * page)
                .limit(limit)
                .toArray();
        })
        .then((defined_results) => {
            if (defined_results.length < limit) {
                return collection.find(query).count().then((count_defined_num) => {
                    query = {
                        [req.custom.sort_by]: { $exists: false },
                    };

                    return collection.find(query, opt)
                            .skip(((limit * page) + defined_results.length) - count_defined_num)
                            .limit(limit - defined_results.length).toArray();
                }).then(results => defined_results.concat(results));
            }
            return defined_results;
        })
        .then((results) => {
            data.time_and_salary = results;

            res.send(data);
        })
        .catch((err) => {
            next(new HttpError("Internal Server Error", 500));
        });
});

router.post('/', (req, res, next) => {
    req.custom = {};
    next();
});

router.post('/', authentication.cachedFacebookAuthenticationMiddleware);
// req.user.facebook --> {id, name}

router.post('/', (req, res, next) => {
    post_helper.collectData(req, res).then(next, next);
}, (req, res, next) => {
    post_helper.validation(req, res).then(next, next);
}, post_helper.main);

router.use('/search_by/company/group_by/company', middleware.group_sort_by);
router.get('/search_by/company/group_by/company', (req, res, next) => {
    // input parameter
    const company = req.query.company;
    if (!company || company === '') {
        next(new HttpError("company is required", 422));
        return;
    }

    const collection = req.db.collection('workings');
    collection.aggregate([
        {
            $match: {
                $or: [
                    { 'company.name': new RegExp(escapeRegExp(company.toUpperCase())) },
                    { 'company.id': company },
                ],
            },
        },
        {
            $sort: {
                job_title: 1,
                created_at: 1,
            },
        },
        {
            $group: {
                _id: "$company",
                has_overtime_salary_yes: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "yes"] }, 1, 0] },
                },
                has_overtime_salary_no: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "no"] }, 1, 0] },
                },
                has_overtime_salary_dont: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "don't know"] }, 1, 0] },
                },
                is_overtime_salary_legal_yes: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "yes"] }, 1, 0] },
                },
                is_overtime_salary_legal_no: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "no"] }, 1, 0] },
                },
                is_overtime_salary_legal_dont: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "don't know"] }, 1, 0] },
                },
                has_compensatory_dayoff_yes: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "yes"] }, 1, 0] },
                },
                has_compensatory_dayoff_no: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "no"] }, 1, 0] },
                },
                has_compensatory_dayoff_dont: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "don't know"] }, 1, 0] },
                },
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                time_and_salary: {
                    $push: {
                        job_title: "$job_title",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        created_at: "$created_at",
                        data_time: "$data_time",
                        //
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        //
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        //
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                average: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                has_overtime_salary_count: {
                    $cond: [
                        { $gte: ["$count", 5] },
                        {
                            yes: "$has_overtime_salary_yes",
                            no: "$has_overtime_salary_no",
                            "don't know": "$has_overtime_salary_dont",
                        },
                        "$skip",
                    ],
                },
                is_overtime_salary_legal_count: {
                    $cond: [
                        { $gte: ["$count", 5] },
                        {
                            yes: "$is_overtime_salary_legal_yes",
                            no: "$is_overtime_salary_legal_no",
                            "don't know": "$is_overtime_salary_legal_dont",
                        },
                        "$skip",
                    ],
                },
                has_compensatory_dayoff_count: {
                    $cond: [
                        { $gte: ["$count", 5] },
                        {
                            yes: "$has_compensatory_dayoff_yes",
                            no: "$has_compensatory_dayoff_no",
                            "don't know": "$has_compensatory_dayoff_dont",
                        },
                        "$skip",
                    ],
                },
                time_and_salary: 1,
                _id: 0,
                company: "$_id",
                count: 1,
            },
        },
        {
            $sort: req.group_sort_by,
        },
    ]).toArray().then((results) => {
        const sort_field = req.query.group_sort_by || "week_work_time";

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (results[0].average[sort_field] === null &&
            results[results.length - 1].average[sort_field] !== null) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[sort_field] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    }).catch((err) => {
        next(err);
    });
});

router.use('/search_by/job_title/group_by/company', middleware.group_sort_by);
router.get('/search_by/job_title/group_by/company', (req, res, next) => {
    // input parameter
    const job_title = req.query.job_title;
    if (!job_title || job_title === '') {
        next(new HttpError("job_title is required", 422));
        return;
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $match: {
                job_title: new RegExp(escapeRegExp(job_title.toUpperCase())),
            },
        },
        {
            $sort: {
                job_title: 1,
                created_at: 1,
            },
        },
        {
            $group: {
                _id: "$company",
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                time_and_salary: {
                    $push: {
                        job_title: "$job_title",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        created_at: "$created_at",
                        data_time: "$data_time",
                        //
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        //
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        //
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
            },
        },
        {
            $project: {
                average: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                time_and_salary: 1,
                _id: 0,
                company: "$_id",
            },
        },
        {
            $sort: req.group_sort_by,
        },
    ]).toArray().then((results) => {
        const sort_field = req.query.group_sort_by || "week_work_time";

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (results[0].average[sort_field] === null &&
            results[results.length - 1].average[sort_field] !== null) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[sort_field] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    }).catch((err) => {
        next(err);
    });
});

/**
 * @api {get} /workings/companies/search 搜尋工時資訊中的公司
 * @apiGroup Workings
 * @apiParam {String} key 搜尋關鍵字
 * @apiParam {Number} [page=0] 顯示第幾頁
 * @apiSuccess {Object[]} .
 * @apiSuccess {Object} ._id
 * @apiSuccess {String} ._id.id 公司統編 (有可能沒有)
 * @apiSuccess {String} ._id.name 公司名稱 (有可能是 Array)
 */
router.get('/companies/search', (req, res, next) => {
    const search = req.query.key || "";
    const page = parseInt(req.query.page, 10) || 0;

    if (search === "") {
        next(new HttpError("key is required", 422));
        return;
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $sort: {
                company: 1,
            },
        },
        {
            $match: {
                $or: [
                    { 'company.name': new RegExp(escapeRegExp(search.toUpperCase())) },
                    { 'company.id': search },
                ],
            },
        },
        {
            $group: {
                _id: "$company",
            },
        },
        {
            $limit: (25 * page) + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

/**
 * @api {get} /workings/jobs/search 搜尋工時資訊中的職稱
 * @apiGroup Workings
 * @apiParam {String} key 搜尋關鍵字
 * @apiParam {Number} [page=0] 顯示第幾頁
 * @apiSuccess {Object[]} .
 * @apiSuccess {String} ._id 職稱
 */
router.get('/jobs/search', (req, res, next) => {
    const search = req.query.key || "";
    const page = parseInt(req.query.page, 10) || 0;

    if (search === "") {
        next(new HttpError("key is required", 422));
        return;
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $sort: {
                job_title: 1,
            },
        },
        {
            $match: {
                job_title: new RegExp(escapeRegExp(search.toUpperCase())),
            },
        },
        {
            $group: {
                _id: "$job_title",
            },
        },
        {
            $limit: (25 * page) + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
