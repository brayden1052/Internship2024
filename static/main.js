document.addEventListener("DOMContentLoaded", function () {
  const uploadBtn = document.getElementById("file-input");
  const copyButton = document.createElement("button");
  copyButton.id = "copy-button";

  uploadBtn.addEventListener("change", handleImageUpload);
  function handleImageUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById("file-input");
    file = fileInput.files[0];


    if (file) {
      const formData = new FormData();
      formData.append("image", file);

      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("Failed to upload image");
          }
        })
        .then((data) => {
          console.log("Image uploaded successfully:", data.imageUrl);
          return getSearchQueries(file.name);
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
        });
    }
  }

  //Display the image the user provides
  function displayImage(imageUrl) {
    const imageContainer = document.getElementById("api-search-container");
    let imgElement = document.getElementById("image");
    console.log(imageUrl);

    if (imgElement) {
      imgElement.src = imageUrl;
    } else {
      imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.alt = "Uploaded Image";
      imgElement.id = "image";
      imageContainer.appendChild(imgElement);
    }
    
  }
  //Retrieves elastic search results
  function getSearchQueries(filename) {


    return fetch("/search", {
      method: "POST",
      body: JSON.stringify({ filename: filename }),
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => {
        console.log(response);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {

        ids = data.ids;
        colors = data.colors;
        prices = data.prices;
        colorCountDict = data.colorCountDict;

        lineList = data.line_list;
        fullOcr = data.ocr_result;
        poly_image_path = data.poly_image_path;

        num_of_matches_str = data.num_of_matches;
        console.log("search finished:");
        displayOcrResults(lineList);
        renderFullOcr(fullOcr);
        document.getElementById("elastic-container").innerHTML = "";
        displayResultsSection(ids,prices,colors, "All Words Search");
        displayColorCount(colorCountDict);
        displayImage(poly_image_path);
        displayMatches(num_of_matches_str);
      })
      .catch((error) => {
        console.error("Error is:", error);
      });
  }

  function displayOcrResults(line_list) {
    const ocrContainer = document.getElementById("ocr-container");
    ocrContainer.querySelectorAll(":not(#show-ocr-button)").forEach((element) => element.remove());

    //create performance stats table
    const resultsTable = document.createElement("table");

    //results table header
    const resultsTableHeader = document.createElement("tr");

    const resultsTableHeaderCol1 = document.createElement("th");
    resultsTableHeaderCol1.textContent = "Lines";
    resultsTableHeader.appendChild(resultsTableHeaderCol1);

    const resultsTableHeaderCol2 = document.createElement("th");
    resultsTableHeaderCol2.textContent = "Result";
    resultsTableHeader.appendChild(resultsTableHeaderCol2);

    resultsTable.appendChild(resultsTableHeader);

    // results table body
    const tbody = document.createElement("tbody");

    for (let i = 0; i < line_list.length; i++) {
      const row = document.createElement("tr");
      const lineNumCell = document.createElement("td");
      lineNumCell.textContent = "Line " + (i + 1);

      const lineContCell = document.createElement("td");
      lineContCell.textContent = line_list[i];

      row.appendChild(lineNumCell);
      row.appendChild(lineContCell);
      tbody.appendChild(row);
    }

    resultsTable.appendChild(tbody);
    ocrContainer.appendChild(resultsTable);

    document.getElementById("show-ocr-button").className = "visible";
  }

  //Displays elastic search results using a table
  function displayResultsSection(ids,prices, colors, tableName) {
    const resultsContainer = document.getElementById("elastic-container");


    //create performance stats table
    const resultsTable = document.createElement("table");

    //results table header
    const resultsTableHeader = document.createElement("tr");

    const resultsTableHeaderCol1 = document.createElement("th");
    resultsTableHeaderCol1.textContent = tableName + ":Id";
    resultsTableHeader.appendChild(resultsTableHeaderCol1);

    const resultsTableHeaderCol2 = document.createElement("th");
    resultsTableHeaderCol2.textContent = "Price";
    resultsTableHeader.appendChild(resultsTableHeaderCol2);

    const resultsTableHeaderCol3 = document.createElement("th");
    resultsTableHeaderCol3.textContent = "Color";
    resultsTableHeader.appendChild(resultsTableHeaderCol3);

    resultsTable.appendChild(resultsTableHeader);

    // results table body
    const tbody = document.createElement("tbody");

    for (let i = 0; i < ids.length; i++) {
      const row = document.createElement("tr");
      const id = ids[i];
      const price = prices[i];
      const color = colors[i];
   
      const idCell = document.createElement("td");
      idCell.textContent = id;

      const priceCell = document.createElement("td");
      priceCell.textContent = price;

      const colorCell = document.createElement("td");
      colorCell.textContent = color;

      row.appendChild(idCell);
      row.appendChild(priceCell);
      row.appendChild(colorCell);
      tbody.appendChild(row);
    }

    resultsTable.appendChild(tbody);
    resultsContainer.appendChild(resultsTable);
  }

  function displayColorCount(colorCountDict){
    const resultsContainer = document.getElementById("elastic-container");
    const resultsTable = document.createElement("table");
    const resultsTableHeader = document.createElement("tr");

    const resultsTableHeaderCol1 = document.createElement("th");
    resultsTableHeaderCol1.textContent = "Color";
    resultsTableHeader.appendChild(resultsTableHeaderCol1);

    const resultsTableHeaderCol2 = document.createElement("th");
    resultsTableHeaderCol2.textContent = "Quantity";
    resultsTableHeader.appendChild(resultsTableHeaderCol2);

     // results table body
     const tbody = document.createElement("tbody");

     let colors = Object.keys(colorCountDictDict);

     for (let i = 0; i < colors.length; i++) {
       const row = document.createElement("tr");
       const color = colors[i];
       const quant = colorCountDict[color];
       console.log("Hello")
    
 
       const colorCell = document.createElement("td");
       colorCell.textContent = color;
 
       const quantCell = document.createElement("td");
       quantCell.textContent = quant;
 
       row.appendChild(colorCellCell);
       row.appendChild(quantCell);
       tbody.appendChild(row);
     }
 
     resultsTable.appendChild(tbody);
     resultsContainer.appendChild(resultsTable);

  }

  function displayMatches(num_of_matches_str){
    const resultsContainer = document.getElementById("elastic-container");
    const pElement = document.createElement('p');
    pElement.textContent = num_of_matches_str;
    resultsContainer.appendChild(pElement);
  }

  document
    .getElementById("show-ocr-button")
    .addEventListener("click", function () {
      handleOcrClick();
    });

    document
    .getElementById("ocr-button-bottom")
    .addEventListener("click", function () {
      handleOcrClick();
    });

  function handleOcrClick(){
    const button = document.getElementById("show-ocr-button");
      const bottomButton = document.getElementById("ocr-button-bottom");
      const header = document.getElementById("full-response-header");
      const preElement = document.getElementById("ocr-text");
      const fullOcrContainer = document.getElementById(
        "show-full-ocr-container"
      );
      if (fullOcrContainer.className == "hidden") {
        button.textContent = "Hide Full OCR Response";
        bottomButton.textContent = "Hide Full OCR Response";
        fullOcrContainer.className = "visible";
        header.className = "visible";
        copyButton.className = "visible";
        preElement.className = "visible";
        document.getElementById("ocr-button-bottom").className = "visible";
      } else {
        button.textContent = "Show Full OCR Response";
        fullOcrContainer.className = "hidden";
        bottomButton.textContent = "Show Full OCR Response"
        header.className = "hidden";
        copyButton.className = "hidden";
        preElement.className = "hidden";
        document.getElementById("ocr-button-bottom").className = "hidden";
      }
  }

  function renderFullOcr() {
    const fullOcrContainer = document.getElementById("show-full-ocr-container");
    document.getElementById("show-full-ocr-container").innerHTML = "";
    const header = document.createElement("header");

    header.id = "full-response-header";
    header.className = "hidden";
    copyButton.id = "copy-button";
    copyButton.className = "hidden"
    copyButton.textContent = "Copy JSON";

    header.appendChild(copyButton);
    fullOcrContainer.className = "hidden";
    fullOcrContainer.innerHTML = `<pre id="ocr-text" class="hidden">${fullOcr}</pre>`;
    fullOcrContainer.append(header);
  }

  copyButton.addEventListener("click", function () {

    const preElement = document.getElementById('ocr-text');
    textToCopy = preElement.textContent;

    const textarea = document.createElement('textarea');
    textarea.textContent = textToCopy;
    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

  });
});
