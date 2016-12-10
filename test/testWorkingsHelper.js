const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const helper = require('../routes/workings_helper');

describe('Workings Helper', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    describe('normalizeCompany', function() {
        before('Seed companies', function() {
            return db.collection('companies').insertMany([
                {
                    id: '00000001',
                    name: 'GOODJOB',
                },
                {
                    id: '00000002',
                    name: 'GOODJOBGREAT',
                },
                {
                    id: '00000003',
                    name: 'GOODJOBGREAT',
                },
            ]);
        });

        it('只給 company_id', function() {
            return assert.becomes(helper.normalizeCompany(db, '00000001'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('禁止錯誤的 company_id', function() {
            return assert.isRejected(helper.normalizeCompany(db, '00000000'));
        });

        it('只給 company query', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GOODJOB'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('當 company 是小寫時，轉換成大寫', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GoodJob'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('只給 company，但名稱無法決定唯一公司', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GoodJobGreat'), {
                name: 'GOODJOBGREAT',
            });
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });
    });
});

