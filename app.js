(async () => {
  const [
    { initializeApp },
    {
      getFirestore,
      doc,
      getDoc,
      collection,
      runTransaction,
      serverTimestamp
    }
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]);

  const firebaseConfig = {
    apiKey: "AIzaSyBTRwdQi-oi6mPi7SlcwfZr528PWpIKFcI",
    authDomain: "newsquest-a6dbc.firebaseapp.com",
    projectId: "newsquest-a6dbc",
    storageBucket: "newsquest-a6dbc.firebasestorage.app",
    messagingSenderId: "450052536521",
    appId: "1:450052536521:web:39e942bfae4c8b1965f518",
    measurementId: "G-KYXXZ5BEPK"
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp);

  function setMessage(message, type = "error") {
    return `<div class="${type}">${message}</div>`;
  }

  function getSession() {
    return JSON.parse(
      sessionStorage.getItem("newsquest_session") || "null"
    );
  }

  function saveSession(session) {
    sessionStorage.setItem(
      "newsquest_session",
      JSON.stringify(session)
    );
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function getArticle(articleId) {
    const articleRef = doc(db, "articles", articleId);
    const snapshot = await getDoc(articleRef);

    if (!snapshot.exists()) {
      throw new Error(
        `Article ${articleId} has not been added to Firestore yet.`
      );
    }

    return {
      articleId: snapshot.id,
      ...snapshot.data()
    };
  }

  function renderWelcome() {
    document.querySelector("#app").innerHTML = `
      <section class="welcome card">
        <div class="welcome-copy">
          <div class="eyebrow">Interactive research reading</div>

          <h1>Read smarter. Remember more.</h1>

          <p class="lead">
            NewsQuest is a gamified news-reading activity. Your respondent code
            automatically assigns you one study article and its five-question quiz.
          </p>

          <form id="start-form">
            <div class="form-group">
              <label for="respondent-code">Respondent code</label>

              <input
                id="respondent-code"
                name="code"
                required
                autocomplete="off"
                placeholder="Example: SET1-001"
              >

              <p class="small">
                Enter the unique code provided by the researcher.
              </p>
            </div>

            <div id="start-message"></div>

            <button class="primary-btn" type="submit">
              Start NewsQuest
            </button>
          </form>
        </div>

        <div class="welcome-art" aria-hidden="true">
          <div class="illustration">
            <div class="illustration-inner">
              <strong>NEWS</strong>
              <hr>
              <p>Read · Learn · Recall</p>
              <span>+100 points</span>
            </div>
          </div>
        </div>
      </section>
    `;

    document
      .querySelector("#start-form")
      .addEventListener("submit", startRespondent);
  }

  async function startRespondent(event) {
    event.preventDefault();

    const input = document
      .querySelector("#respondent-code")
      .value
      .trim()
      .toUpperCase();

    const message = document.querySelector("#start-message");

    if (!input) {
      message.innerHTML = setMessage(
        "Please enter your respondent code."
      );
      return;
    }

    try {
      message.innerHTML = setMessage(
        "Checking your respondent code...",
        "notice"
      );

      const codeRef = doc(db, "respondentCodes", input);
      const codeSnapshot = await getDoc(codeRef);

      if (!codeSnapshot.exists()) {
        message.innerHTML = setMessage(
          "This respondent code is not valid."
        );
        return;
      }

      const record = codeSnapshot.data();

      if (record.status === "Used") {
        message.innerHTML = setMessage(
          "This respondent code has already been used."
        );
        return;
      }

      if (!record.articleId) {
        message.innerHTML = setMessage(
          "This respondent code does not have an assigned article."
        );
        return;
      }

      const article = await getArticle(record.articleId);

      if (
        !Array.isArray(article.questions) ||
        article.questions.length !== 5
      ) {
        message.innerHTML = setMessage(
          "The assigned article does not have exactly five questions."
        );
        return;
      }

      const session = {
        code: input,
        set: record.set,
        articleId: record.articleId,
        startedAt: new Date().toISOString()
      };

      saveSession(session);

      renderArticle(article);
    } catch (error) {
      console.error(error);

      message.innerHTML = setMessage(
        "Something went wrong while connecting to NewsQuest."
      );
    }
  }

  function renderArticle(article) {
    const session = getSession();

    document.querySelector("#app").innerHTML = `
      <div class="topbar">
        <div class="progress-wrap">
          <div class="progress-label">
            <span>Reading stage</span>
            <span>1 of 2</span>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: 50%"
            ></div>
          </div>
        </div>

        <div class="points">+0 points</div>
      </div>

      <article class="article-card card">
        <img
          class="article-image"
          src="${escapeHTML(article.image || "")}"
          alt="Article image"
        >

        <div class="article-content">
          <div class="eyebrow">
            Set ${escapeHTML(session.set)} · Assigned reading
          </div>

          <h2>${escapeHTML(article.title)}</h2>

          <p class="article-body">
            ${escapeHTML(article.body)}
          </p>

          <div class="action-row">
            <button
              id="begin-quiz"
              class="primary-btn"
            >
              I'm ready for the five-question quiz
            </button>
          </div>
        </div>
      </article>
    `;

    document
      .querySelector("#begin-quiz")
      .addEventListener("click", () => {
        renderQuiz(article);
      });
  }

  function renderQuiz(article) {
    document.querySelector("#app").innerHTML = `
      <div class="topbar">
        <div class="progress-wrap">
          <div class="progress-label">
            <span>Quiz progress</span>
            <span>2 of 2 · 5 questions</span>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: 100%"
            ></div>
          </div>
        </div>

        <div class="points">Up to 100 points</div>
      </div>

      <form id="quiz-form" class="quiz-card card">
        <div class="eyebrow">Knowledge check</div>

        <h2>${escapeHTML(article.title)}</h2>

        <p class="small">
          Answer all five questions before submitting.
        </p>

        ${article.questions.map((question, index) => `
          <fieldset class="question">
            <legend class="question-title">
              ${index + 1}. ${escapeHTML(question.text)}
            </legend>

            ${question.choices.map((choice, choiceIndex) => `
              <label class="choice">
                <input
                  type="radio"
                  name="question-${index}"
                  value="${choiceIndex}"
                  required
                >

                <span>
                  ${escapeHTML(choice)}
                </span>
              </label>
            `).join("")}
          </fieldset>
        `).join("")}

        <div id="quiz-message"></div>

        <button
          class="primary-btn"
          type="submit"
        >
          Submit quiz
        </button>
      </form>
    `;

    document
      .querySelector("#quiz-form")
      .addEventListener("submit", event => {
        submitQuiz(event, article);
      });
  }

  async function submitQuiz(event, article) {
    event.preventDefault();

    const session = getSession();
    const formData = new FormData(event.target);
    const message = document.querySelector("#quiz-message");

    const answers = article.questions.map((_, index) =>
      Number(formData.get(`question-${index}`))
    );

    const score = article.questions.reduce(
      (total, question, index) => {
        return total +
          (answers[index] === question.correct ? 1 : 0);
      },
      0
    );

    const responseData = {
      respondentCode: session.code,
      set: session.set,
      articleId: session.articleId,
      answers,
      score,
      totalQuestions: 5,
      percentage: score * 20,
      points: score * 20,
      submittedAt: serverTimestamp(),
      status: "Completed"
    };

    try {
      message.innerHTML = setMessage(
        "Submitting your answers...",
        "notice"
      );

      const codeRef = doc(
        db,
        "respondentCodes",
        session.code
      );

  const responseRef = doc(
  db,
  "responses",
  session.code
);
      await runTransaction(db, async transaction => {
        const codeSnapshot = await transaction.get(codeRef);

        if (!codeSnapshot.exists()) {
          throw new Error("CODE_NOT_FOUND");
        }

        const currentCode = codeSnapshot.data();

        if (currentCode.status === "Used") {
          throw new Error("CODE_ALREADY_USED");
        }

        transaction.update(codeRef, {
          status: "Used",
          usedAt: serverTimestamp()
        });

        transaction.set(responseRef, responseData);
      });

      renderResult({
        ...responseData,
        submittedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);

      if (error.message === "CODE_ALREADY_USED") {
        message.innerHTML = setMessage(
          "This respondent code has already been used."
        );
        return;
      }

      if (error.message === "CODE_NOT_FOUND") {
        message.innerHTML = setMessage(
          "This respondent code is no longer available."
        );
        return;
      }

      message.innerHTML = setMessage(
        "Your response could not be submitted. Please try again."
      );
    }
  }

  function renderResult(response) {
    document.querySelector("#app").innerHTML = `
      <section class="result-card card">
        <div class="eyebrow">Completed</div>

        <h2>Your NewsQuest result</h2>

        <div class="result-score">
          ${response.score}/5
        </div>

        <div class="stat-grid">
          <div class="stat">
            <span class="small">Percentage</span>
            <strong>${response.percentage}%</strong>
          </div>

          <div class="stat">
            <span class="small">Points earned</span>
            <strong>${response.points}</strong>
          </div>

          <div class="stat">
            <span class="small">Status</span>
            <strong>Done</strong>
          </div>
        </div>

        <div class="notice">
          Thank you. Your response has been recorded.
          This respondent code cannot be used for another attempt.
        </div>

        <p class="small">
          Correct answers are not displayed in the respondent interface.
        </p>
      </section>
    `;
  }

  renderWelcome();
})();
