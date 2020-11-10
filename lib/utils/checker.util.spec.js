"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const checkerFunctions = tslib_1.__importStar(require("./checker.util"));
const sinon_1 = tslib_1.__importDefault(require("sinon"));
const chai_1 = require("chai");
const util = tslib_1.__importStar(require("./logger.util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
describe('src/templates/utils/checker.util', () => {
    let sandbox;
    let showErrorStub;
    let fsMkdirSyncstub;
    let fsExistsSyncStub;
    let processStub;
    let checkExistenceStub;
    beforeEach(() => {
        sandbox = sinon_1.default.createSandbox();
        fsMkdirSyncstub = sandbox.stub(fs_1.default, 'mkdirSync');
        fsExistsSyncStub = sandbox.stub(fs_1.default, 'existsSync');
        showErrorStub = sandbox.stub(util, 'showError');
        processStub = sandbox.stub(process, 'exit');
    });
    afterEach(() => {
        sandbox.restore();
    });
    context('checkIfDirExistElseMakeDir:', () => {
        it('directory does not exist', async () => {
            checkExistenceStub = sandbox.stub(checkerFunctions, 'checkExistence').returns(true);
            await checkerFunctions.checkIfDirExistElseMakeDir(true, 'somePath');
            chai_1.expect(checkExistenceStub).to.be.calledOnce;
            chai_1.expect(checkExistenceStub).to.be.calledOnce;
        });
        it('directory does exist', async () => {
            checkExistenceStub = sandbox.stub(checkerFunctions, 'checkExistence').returns(false);
            await checkerFunctions.checkIfDirExistElseMakeDir(true, 'somePath');
            chai_1.expect(checkExistenceStub).to.be.calledOnce;
            chai_1.expect(fsMkdirSyncstub).to.be.calledOnce;
        });
    });
    context('checkExistence:', () => {
        it('checks if given path exists', async () => {
            await checkerFunctions.checkExistence('somePath');
            chai_1.expect(fsExistsSyncStub).to.be.calledOnce;
        });
    });
    context('fileAlreadyExist:', () => {
        it('should show error and exit the process', async () => {
            await checkerFunctions.fileAlreadyExist('file-name');
            chai_1.expect(showErrorStub).to.be.calledOnceWith('file-name already exists!');
            chai_1.expect(processStub).to.be.calledOnceWith(1);
        });
    });
});
