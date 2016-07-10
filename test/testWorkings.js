const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('POST /workings', function() {
    var db = undefined;

    before(function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    function generatePayload(opt) {
        opt = opt || {};
        const valid = {
            job_title: 'test',
            week_work_time: '40',
            overtime_frequency: '3',
            day_promised_work_time: '8',
            day_real_work_time: '10',
            company_id: '00000000',
            company: 'GoodJob',
        };

        var payload = {};
        for (let key in valid) {
            if (opt[key]) {
                if (opt[key] === -1) {
                    continue;
                } else {
                    payload[key] = opt[key];
                }
            } else {
                payload[key] = valid[key];
            }
        }

        return payload;
    }

    it('需要回傳 401 如果不能 FB 登入');

    describe('job_title (職稱)', function() {
        it('is required', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    job_title: -1,
                }))
                .expect(422)
                .end(done);
        });
    });

    describe('week_work_time (最近一週實際工時)', function() {
        it('is required', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    week_work_time: -1,
                }))
                .expect(422)
                .end(done);
        });

        it('should be a number', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    week_work_time: "test",
                }))
                .expect(422)
                .end(done);
        });

        it('should be a valid number', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    week_work_time: "186",
                }))
                .expect(422)
                .end(done);
        });
    });

    describe('overtime_frequency 加班頻率', function() {
        it('is required', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    overtime_frequency: -1,
                }))
                .expect(422)
                .end(done);
        });

        it('should in [0, 1, 2, 3]', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    overtime_frequency: '5',
                }))
                .expect(422)
                .end(done);
        });
    });

    describe('day_promised_work_time', function() {
        it('is required');
        it('should be a number');
        it('should be a valid number');
    });
    
    describe('day_real_work_time', function() {
        it('is required');
        it('should be a number');
        it('should be a valid number');
    });
    
    describe('company (公司/單位名稱)', function() {
        it('is required', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    company: -1,
                    company_id: -1,
                }))
                .expect(422)
                .end(done);
        });
    });

    /*it('should successfully insert', function(done) {
        request(app).post('/workings')
            .send(generatePayload({
            }))
            .expect(200)
            .end(done);
    });*/

    describe('company', function() {
        before(function() {
            return db.collection('companies').insertMany([
                {
                    id: '00000001',
                    name: 'GoodJob',
                },
                {
                    id: '00000002',
                    name: 'GoodJobGreat',
                },
                {
                    id: '00000003',
                    name: 'GoodJobGreat',
                },
            ]);
        });

        it('只給 company_id 成功新增', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    company_id: '00000001',
                    company: -1,
                }))
                .expect(200)
                .expect(function(res) {
                    assert.equal(res.body.company.id, '00000001');
                    assert.equal(res.body.company.name, 'GoodJob');
                })
                .end(done);
        });
    
        it('禁止錯誤的 company_id', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    company_id: '00000000',
                    company: -1,
                }))
                .expect(429)
                .end(done);
        });

        it('只給 company 成功新增', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    company_id: -1,
                    company: 'GoodJob',
                }))
                .expect(200)
                .expect(function(res) {
                    assert.equal(res.body.company.id, '00000001');
                    assert.equal(res.body.company.name, 'GoodJob');
                })
                .end(done);
        });

        it('只給 company，但名稱無法決定唯一公司，成功新增', function(done) {
            request(app).post('/workings')
                .send(generatePayload({
                    company_id: -1,
                    company: 'GoodJobGreat',
                }))
                .expect(200)
                .expect(function(res) {
                    assert.isUndefined(res.body.company.id);
                    assert.equal(res.body.company.name, 'GoodJobGreat');
                })
                .end(done);
        });
    
        after(function() {
            return db.collection('companies').remove({});
        });
    });

    after(function() {
        return Promise.all([
            db.collection('workings').remove({}),
            db.collection('authors').remove({})
        ]);
    });
});
