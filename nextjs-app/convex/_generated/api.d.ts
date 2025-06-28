/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_extractFileContent from "../actions/extractFileContent.js";
import type * as actions_generateImprovements from "../actions/generateImprovements.js";
import type * as actions_generateQA from "../actions/generateQA.js";
import type * as actions_generateSuggestions from "../actions/generateSuggestions.js";
import type * as actions_processFileAndGenerateQA from "../actions/processFileAndGenerateQA.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authConfig from "../authConfig.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as improvements from "../improvements.js";
import type * as lectures from "../lectures.js";
import type * as liveQuiz from "../liveQuiz.js";
import type * as personalization from "../personalization.js";
import type * as qa from "../qa.js";
import type * as stats from "../stats.js";
import type * as students from "../students.js";
import type * as testData from "../testData.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/extractFileContent": typeof actions_extractFileContent;
  "actions/generateImprovements": typeof actions_generateImprovements;
  "actions/generateQA": typeof actions_generateQA;
  "actions/generateSuggestions": typeof actions_generateSuggestions;
  "actions/processFileAndGenerateQA": typeof actions_processFileAndGenerateQA;
  analytics: typeof analytics;
  auth: typeof auth;
  authConfig: typeof authConfig;
  files: typeof files;
  http: typeof http;
  improvements: typeof improvements;
  lectures: typeof lectures;
  liveQuiz: typeof liveQuiz;
  personalization: typeof personalization;
  qa: typeof qa;
  stats: typeof stats;
  students: typeof students;
  testData: typeof testData;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
