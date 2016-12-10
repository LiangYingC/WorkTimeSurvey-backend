const chai = require('chai');
chai.use(require('chai-datetime'));
const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('Workings 工時資訊', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    describe('GET /workings/latest', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    overtime_frequency: 1,
                    sector: "AAA",
                    created_at: new Date("2016-09-06 08:00"),
                },
                {
                    overtime_frequency: 2,
                    created_at: new Date("2016-09-06 09:00"),
                },
                {
                    overtime_frequency: 1,
                    sector: "CCC",
                    created_at: new Date("2016-09-06 09:03"),
                },
                {
                    overtime_frequency: 4,
                    created_at: new Date("2016-09-06 09:04"),
                },
            ]);
        });

        it('return the pagination', function(done) {
            request(app).get('/workings/latest')
                .expect(200)
                .expect(function(res) {
                    assert.propertyVal(res.body, 'total', 4);
                    assert.property(res.body, 'workings');
                    assert.lengthOf(res.body.workings, 4);
                })
                .end(done);
        });

        it('return the correct field', function(done) {
            request(app).get('/workings/latest')
                .expect(200)
                .expect(function(res) {
                    assert.deepPropertyVal(res.body.workings, '0.overtime_frequency', 4);
                    assert.notDeepProperty(res.body.workings, '0.author');
                    assert.notDeepProperty(res.body.workings, '0.sector');
                    assert.deepPropertyVal(res.body.workings, '1.sector', 'CCC');
                    assert.notDeepProperty(res.body.workings, '2.sector');
                    assert.deepPropertyVal(res.body.workings, '3.sector', 'AAA');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /search-and-group/by-company', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1" },
                    week_work_time: 40,
                    overtime_frequency: 0,
                    day_promised_work_time: 8,
                    day_real_work_time: 8,
                    created_at: new Date("2016-07-21T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "yes",
                    has_compensatory_dayoff: "yes",
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 40,
                    overtime_frequency: 2,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "no",
                    has_compensatory_dayoff: "no",
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 55,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 11,
                    created_at: new Date("2016-07-22T14:15:44.929Z"),
                    sector: "TAINAN",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "don't know",
                    has_compensatory_dayoff: "no",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 45,
                    overtime_frequency: 1,
                    day_promised_work_time: 9,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-23T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "yes",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 47,
                    overtime_frequency: 3,
                    day_promised_work_time: 7,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAICHUNG",
                    has_overtime_salary: "don't know",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 38,
                    overtime_frequency: 0,
                    day_promised_work_time: 7,
                    day_real_work_time: 7,
                    created_at: new Date("2016-07-25T14:15:44.929Z"),
                    sector: "TAICHUNG",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 44,
                    overtime_frequency: 1,
                    day_promised_work_time: 8,
                    day_real_work_time: 7,
                    created_at: new Date("2016-07-29T14:15:44.929Z"),
                    sector: "TAICHUNG",
                    has_overtime_salary: "yes",
                },
                {
                    job_title: "ENGINEER2",
                    company: {name: "COMPANY2"},
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "ENGINEER3",
                    company: {name: "COM_PANY"},
                    week_work_time: 66,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 12,
                    created_at: new Date("2016-07-30T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "yes",
                },
            ]);
        });

        it('error 422 if no company provided', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .expect(422)
                .end(done);
        });

        it('依照 company 來分群資料，結構正確 (workings.length >= 5)', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], '_id');
                    assert.deepProperty(res.body[0], '_id.name');
                    assert.deepProperty(res.body[0], 'workings');
                    assert.isArray(res.body[0].workings);
                    assert(res.body[0].workings.length >= 5);
                    assert.deepProperty(res.body[0], 'workings.0.job_title');
                    assert.deepProperty(res.body[0], 'workings.0.week_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.overtime_frequency');
                    assert.deepProperty(res.body[0], 'workings.0.day_promised_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.day_real_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.created_at');
                    assert.deepProperty(res.body[0], 'workings.0.sector');
                    assert.deepProperty(res.body[0], 'count');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.yes');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.no');
                    assert.deepProperty(res.body[0], "has_overtime_salary_count.don't know");
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.yes');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.no');
                    assert.deepProperty(res.body[0], "is_overtime_salary_legal_count.don't know");
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.yes');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.no');
                    assert.deepProperty(res.body[0], "has_compensatory_dayoff_count.don't know");
                })
                .end(done);
        });

        it('依照 company 來分群資料，結構正確 (workings.length < 5)', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY2'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], '_id');
                    assert.deepProperty(res.body[0], '_id.name');
                    assert.deepProperty(res.body[0], 'workings');
                    assert.isArray(res.body[0].workings);
                    assert(res.body[0].workings.length < 5);
                    assert.deepProperty(res.body[0], 'workings.0.job_title');
                    assert.deepProperty(res.body[0], 'workings.0.week_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.overtime_frequency');
                    assert.deepProperty(res.body[0], 'workings.0.day_promised_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.day_real_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.created_at');
                    assert.deepProperty(res.body[0], 'workings.0.sector');
                    assert.deepProperty(res.body[0], 'count');
                    assert.notDeepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.notDeepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.notDeepProperty(res.body[0], 'has_compensatory_dayoff_count');
                })
                .end(done);
        });

        it('小寫 company query 轉換成大寫', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'company1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');
                })
                .end(done);
        });

        it('company match any substring in _id.name', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body, '1._id.name', 'COMPANY2');
                })
                .end(done);
        });

        it('依照 job_title 排序 group data', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');

                    let workings = res.body[0].workings;
                    assert.deepPropertyVal(workings, '2.job_title', 'ENGINEER1');
                    assert.deepPropertyVal(workings, '3.job_title', 'ENGINEER2');
                })
                .end(done);
        });

        it('依照 group data 數量由大到小排序 company', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    for (let idx=0; idx < res.body.length-1; ++idx) {
                        assert(res.body[idx].workings.length >= res.body[idx+1].workings.length);
                    }
                })
                .end(done);
        });

        it('根據統編搜尋', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: '84149961'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.id', '84149961');
                })
                .end(done);
        });

        it('當 workings.length >= 5, has_overtime_salary_count values 加總會小於等於 workings.length', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].has_overtime_salary_count.yes;
                    total += res.body[0].has_overtime_salary_count.no;
                    total += res.body[0].has_overtime_salary_count["don't know"];
                    assert(total <= res.body[0].workings.length);

                })
                .end(done);
        });

        it('當 workings.length >= 5, has_overtime_salary_count.yes 會大於等於 is_overtime_salary_legal_count values 加總',
            function(done) {
                request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].is_overtime_salary_legal_count.yes;
                    total += res.body[0].is_overtime_salary_legal_count.no;
                    total += res.body[0].is_overtime_salary_legal_count["don't know"];
                    assert(res.body[0].has_overtime_salary_count.yes >= total);
                })
                .end(done);
            });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /search-and-group/by-job-title', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 40,
                    overtime_frequency: 0,
                    day_promised_work_time: 8,
                    day_real_work_time: 8,
                    created_at: new Date("2016-07-21T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "yes",
                    has_compensatory_dayoff: "yes",
                    author: {
                    },
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 40,
                    overtime_frequency: 2,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "no",
                    has_compensatory_dayoff: "no",
                    author: {
                    },
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 55,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 11,
                    created_at: new Date("2016-07-22T14:15:44.929Z"),
                    sector: "TAINAN",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "don't know",
                    has_compensatory_dayoff: "no",
                    author: {
                    },
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 45,
                    overtime_frequency: 1,
                    day_promised_work_time: 9,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-23T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    is_overtime_salary_legal: "",
                    has_compensatory_dayoff: "yes",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 47,
                    overtime_frequency: 3,
                    day_promised_work_time: 7,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAICHUNG",
                    has_overtime_salary: "don't know",
                    is_overtime_salary_legal: "",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "ENGINEER2",
                    company: {name: "COMPANY"},
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    is_overtime_salary_legal: "",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "TEACHER",
                    company: {name: "COMPANY"},
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    is_overtime_salary_legal: "",
                    has_compensatory_dayoff: "don't know",
                },
            ]);
        });

        it('error 422 if no job_title provided', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .expect(422)
                .end(done);
        });

        it('依照 job_title 來分群資料，結構正確', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id');
                    assert.deepProperty(res.body, '0.workings');
                    assert.isArray(res.body[0].workings);
                    assert.deepProperty(res.body, '0.workings.0.company.name');
                    assert.deepProperty(res.body, '0.workings.0.week_work_time');
                    assert.deepProperty(res.body, '0.workings.0.overtime_frequency');
                    assert.deepProperty(res.body, '0.workings.0.day_promised_work_time');
                    assert.deepProperty(res.body, '0.workings.0.day_real_work_time');
                    assert.deepProperty(res.body, '0.workings.0.created_at');
                    assert.deepProperty(res.body, '0.workings.0.sector');
                    assert.notDeepProperty(res.body, '0.workings.0.author');
                    assert.notDeepProperty(res.body, '0.workings.0.has_overtime_salary');
                    assert.notDeepProperty(res.body, '0.workings.0.is_overtime_salary_legal');
                    assert.notDeepProperty(res.body, '0.workings.0.has_compensatory_dayoff');
                })
                .end(done);
        });

        it('小寫 job_title 轉換成大寫', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'engineer1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id', 'ENGINEER1');
                })
                .end(done);
        });

        it('job_title match any substring in 工時資訊.job_title 欄位', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    assert.deepPropertyVal(res.body, '0._id', 'ENGINEER1');
                    assert.deepPropertyVal(res.body, '1._id', 'ENGINEER2');
                })
                .end(done);
        });

        it('依照 company 排序 group data', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER2'})
                .expect(200)
                .expect(function(res) {
                    const workings = res.body[0].workings;
                    assert.deepPropertyVal(workings, '0.company.name', 'COMPANY1');
                    assert.deepPropertyVal(workings, '1.company.name', 'COMPANY1');
                    assert.deepPropertyVal(workings, '2.company.name', 'COMPANY');
                })
                .end(done);
        });

        it('依照 group data 數量由大到小排序 job_title', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER'})
                .expect(200)
                .expect(function(res) {
                    for (let idx = 0; idx < res.body.length - 1; idx++) {
                        assert(res.body[idx].workings.length >= res.body[idx + 1].workings.length);
                    }
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /workings/companies/search', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 10,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 20,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB2',
                    week_work_time: 20,
                },
                {
                    company: {
                        name: 'YOUR GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 25,
                },
                {
                    company: {
                        name: 'OTHER BADJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 40,
                },
            ]);
        });

        it('error 422 if no key provided', function(done) {
            request(app).get('/workings/companies/search')
                .expect(422)
                .end(done);
        });

        it('正確搜尋出公司名稱', function(done) {
            request(app).get('/workings/companies/search')
                .query({key: 'GOODJOB'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('小寫關鍵字轉換成大寫', function(done) {
            request(app).get('/workings/companies/search')
                .query({key: 'goodjob'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /workings/jobs/search', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 10,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 20,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB2',
                    week_work_time: 20,
                },
                {
                    company: {
                        name: 'YOUR GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 25,
                },
                {
                    company: {
                        name: 'OTHER BADJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 40,
                },
            ]);
        });

        it('error 422 if no key provided', function(done) {
            request(app).get('/workings/jobs/search')
                .expect(422)
                .end(done);
        });

        it('正確搜尋出職稱', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'JOB'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('正確搜尋出職稱', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'JOB1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 1);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('小寫關鍵字轉換成大寫', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'job'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });
});

