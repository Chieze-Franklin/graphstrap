"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitbucketPath = exports.GitlabPath = exports.GithubPath = void 0;
var GithubPath;
(function (GithubPath) {
    GithubPath["ISSUE_TEMPLATE"] = "/.github/ISSUE_TEMPLATE";
    GithubPath["PULL_REQUEST_TEMPLATE"] = "/.github/PULL_REQUEST_TEMPLATE";
})(GithubPath = exports.GithubPath || (exports.GithubPath = {}));
var GitlabPath;
(function (GitlabPath) {
    GitlabPath["ISSUE_TEMPLATE"] = "/.gitlab/issue_templates";
    GitlabPath["MERGE_REQUEST_TEMPLATE"] = "/.gitlab/merge_request_templates";
    GitlabPath["CI"] = "/.gitlab/ci";
})(GitlabPath = exports.GitlabPath || (exports.GitlabPath = {}));
var BitbucketPath;
(function (BitbucketPath) {
    BitbucketPath["ISSUE_TEMPLATE"] = "/.bitbucket/ISSUE_TEMPLATE";
    BitbucketPath["PULL_REQUEST_TEMPLATE"] = "/.bitbucket/PULL_REQUEST_TEMPLATE";
})(BitbucketPath = exports.BitbucketPath || (exports.BitbucketPath = {}));
