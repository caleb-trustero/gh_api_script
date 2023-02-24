import * as dotenv from "dotenv";
import axios from "axios";
import ObjectsToCsv from "objects-to-csv";

dotenv.config();

// enums
const PR_STATE_OPTIONS = {
  CLOSED: "closed",
  OPEN: "open",
  ALL: "all",
};

// constants
const { OUTPUT_FILE, PAT, ORG, REPO } = process.env;
const PR_STATE = PR_STATE_OPTIONS.CLOSED;
const APPROVED = "APPROVED";

// helpers
const getPullRequestsUrl = (pageNumber) =>
  `https://api.github.com/repos/${ORG}/${REPO}/pulls?state=${PR_STATE}&per_page=40&page=${pageNumber}`;
const getReviewerUrl = (prNumber) =>
  `https://api.github.com/repos/${ORG}/${REPO}/pulls/${prNumber}/reviews`;

// api calls
const getPullRequests = async (pageNumber = 1) => {
  try {
    const response = await axios({
      method: "get",
      url: getPullRequestsUrl(pageNumber),
      headers: {
        Authorization: `token ${PAT}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.status === 200)
      throw new Error(`API call error: ${response.status}`);
    return response.data;
  } catch (error) {
    console.log("ERROR", error);
  }
};

const getReviews = async (prNumber) => {
  try {
    const response = await axios({
      method: "get",
      url: getReviewerUrl(prNumber),
      headers: {
        Authorization: `token ${PAT}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.status === 200)
      throw new Error(`API call error: ${response.status}`);
    return response.data;
  } catch (error) {
    console.log("ERROR", error);
  }
};

const getReviewersFromPr = async (prData) =>
  await Promise.all(
    prData.map(async (pr) => {
      const reviewResponse = await getReviews(pr.number);

      const prApproval = reviewResponse.find((elem) => elem.state === APPROVED);
      return {
        title: pr.title,
        number: pr.number,
        link: pr.html_url,
        user: pr.user.login,
        approver:
          prApproval?.user?.login ||
          `No approver found. Check here ${pr.html_url}`,
      };
    })
  );

// function calls
const ghPrs = await getPullRequests();
const dataArray = await getReviewersFromPr(ghPrs);

// create csv file
const csv = new ObjectsToCsv(dataArray);
await csv.toDisk(`./${OUTPUT_FILE}.csv`);
