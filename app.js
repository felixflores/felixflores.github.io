const form = document.getElementById("donationForm");
const messageInput = document.getElementById("messageInput");
const futureValueDiv = document.getElementById("futureValue");
const amountInput = document.getElementById("amountInput");
const donateButton = document.getElementById("donateButton");
const purposeSuggestions =
  document.getElementsByClassName("purpose-suggestion");

const purposes = [
  "Collegiate cash for success",
  "Helping you slay the semester, one expense at a time",
  "Covering your college costs so you can focus on your future",
  "Lifestyle on fleek, education on deck - you got this!",
  "Making this college experience a little more enjoyable",
  "Investing in your future, one bill at a time",
];

const messageSuggestionsDiv =
  document.getElementById("messageSuggestions");

function displayMessageSuggestions() {
  purposes.forEach((purpose) => {
    const button = document.createElement("button");
    button.textContent = purpose;
    button.className =
      "purpose-suggestion p-2 bg-gray-200 rounded text-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500";
    button.type = "button"; // Prevent form submission
    button.onclick = () => selectMessageSuggestion(purpose);
    messageSuggestionsDiv.appendChild(button);
  });
}

function selectMessageSuggestion(suggestion) {
  messageInput.value = suggestion;
  messageSuggestionsDiv.querySelectorAll("button").forEach((btn) => {
    btn.classList.remove("bg-blue-500", "text-white");
    btn.classList.add("bg-gray-200");
  });
  event.target.classList.remove("bg-gray-200");
  event.target.classList.add("bg-blue-500", "text-white");
  messageInput.focus();
}

displayMessageSuggestions();

function minimalUrlEncode(str) {
  return str.replace(
    /[^\w.,;-]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function validateForm() {
  if (form.checkValidity()) {
    donateButton.classList.remove(
      "bg-gray-300",
      "text-gray-600",
      "cursor-not-allowed"
    );
    donateButton.classList.add(
      "bg-green-500",
      "text-white",
      "hover:bg-green-600",
      "cursor-pointer"
    );
    updateVenmoLink();
  } else {
    donateButton.classList.add(
      "bg-gray-300",
      "text-gray-600",
      "cursor-not-allowed"
    );
    donateButton.classList.remove(
      "bg-green-500",
      "text-white",
      "hover:bg-green-600",
      "cursor-pointer"
    );
    donateButton.href = "#";
  }
}

function updateVenmoLink() {
  const amount = amountInput.value;
  const message = `${minimalUrlEncode(messageInput.value)}%20%23babyFund`;
  const venmoUsername = "felixflores86";
  const venmoLink = `https://venmo.com/?txn=pay&audience=friends&recipients=${venmoUsername}&amount=${amount}&note=${message}`;
  donateButton.href = venmoLink;
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.textContent = message;
  errorDiv.className =
    "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4";
  form.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Add event listeners
amountInput.addEventListener("input", validateForm);
messageInput.addEventListener("input", validateForm);

// Iterate over each element and add the event listener
suggestions.forEach((element) => {
  element.addEventListener("click", validateForm);
});

// Initial validation
validateForm();

const CollegeFundCalc = {
  calculateFutureValue: function (
    principal,
    years,
    rate,
    compoundingFrequency = 12
  ) {
    // Convert rate to decimal
    const r = rate / 100;
    // A = P(1 + r/n)^(nt)
    return (
      principal *
      Math.pow(1 + r / compoundingFrequency, compoundingFrequency * years)
    );
  },

  formatCurrency: function (amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  },
};

function updateFutureValue() {
  const amount = parseFloat(amountInput.value);
  if (!isNaN(amount) && amount > 0) {
    const futureValue = CollegeFundCalc.calculateFutureValue(
      amount,
      18,
      6.5
    );
    futureValueDiv.textContent = `In 18 years this will be ${CollegeFundCalc.formatCurrency(
      futureValue
    )}`;
  } else {
    futureValueDiv.textContent =
      "Enter an amount to see its future value";
  }
}

amountInput.addEventListener("input", updateFutureValue);
updateFutureValue();

async function fetchDonors() {
  try {
    const response = await fetch(
      "https://account.venmo.com/api/stories?feedType=friend&externalId=1943936465633280236"
    );
    const data = await response.json();
    const donors = data.stories
      .filter((story) => story.note.content.includes("#babyFund"))
      .map((story) => ({
        name: story.title.sender.displayName,
        amount: story.amount,
        message: story.note.content,
        date: new Date(story.date).toLocaleDateString(),
      }));
    displayDonors(donors);
  } catch (error) {
    console.error("Error fetching donors:", error);
  }
}

function displayDonors(donors) {
  const donorList = document.getElementById("donors");
  donorList.innerHTML = donors
    .map(
      (donor) => `
    <li class="bg-white p-4 rounded-md shadow">
      <div class="font-bold">${donor.name}</div>
      <div class="text-green-600">${donor.amount}</div>
      <div class="text-gray-600">${donor.message}</div>
      <div class="text-sm text-gray-400">${donor.date}</div>
    </li>
    `
    )
    .join("");
}

// Fetch donors when the page loads
fetchDonors();
