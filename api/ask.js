document.getElementById("askForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const question = document.getElementById("question").value;
  const loadingEl = document.getElementById("loading");
  const answerContainer = document.getElementById("answerContainer");
  const answerEl = document.getElementById("answer");

  loadingEl.style.display = "block";
  answerContainer.style.display = "none";
  answerEl.textContent = "";
  imageEl.style.display = "none";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();
    loadingEl.style.display = "none";

    if (data.success && data.answer) {
      answerEl.textContent = data.answer;
      answerContainer.style.display = "block";

      if (data.image) {
        let imageURL = data.image;

        // Check if the image URL is from Google Drive
        if (imageURL.includes("drive.google.com")) {
          const imageId = imageURL.split('id=')[1].split('&')[0];
          imageURL = `https://drive.google.com/uc?id=${imageId}`; // Transform to embeddable image URL
        }

        // Display the image beside the answer
        const imageHtml = `<img src="${imageURL}" alt="Answer Image" style="max-width: 200px; margin-left: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);">`;
        answerContainer.innerHTML = `<div style="display: flex; align-items: center;">${answerEl.textContent}${imageHtml}</div>`;
      }
    } else {
      answerEl.textContent = data.error || "No answer found.";
      answerContainer.style.display = "block";
    }
  } catch (error) {
    console.error('Fetch error:', error);
    loadingEl.style.display = "none";
    answerEl.textContent = "Error fetching data. Please try again later.";
    answerContainer.style.display = "block";
  }
});
