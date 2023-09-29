var privileges = ["cellValue", "configuration"];

const googleTranslateAPI = "YOUR_GOOGLE_TRANSLATE_API_KEY";

var templateCell_$PLUGIN_ID = document.createElement("template");

var batchTranslationCheckbox = document.createElement("input");
batchTranslationCheckbox.type = "checkbox";
batchTranslationCheckbox.id = "batch-translation";
batchTranslationCheckbox.name = "batch-translation";
batchTranslationCheckbox.value = "batch";
batchTranslationCheckbox.textContent = "Batch Translation";
batchTranslationCheckbox.style.marginTop = "10px";
batchTranslationCheckbox.style.position = "absolute";

var batchTranslationSelect = document.createElement("select");
batchTranslationSelect.id = "batch-translation-select";
batchTranslationSelect.name = "batch-translation-select";
batchTranslationSelect.style.marginTop = "10px";
batchTranslationSelect.style.position = "absolute";

templateCell_$PLUGIN_ID.innerHTML = `
<style>
    #container {
        display: flex;
        flex-direction: column;
        align-items: right;
        padding: 0 15px;
        position:relative;
    }

    .language-select {
        border: none;
        outline: none;
        background-color: transparent;
        width: 100%;
        
    }

    #batch-translation {
        background-color:#C9C9C9;
        color: #C9C9C9;
        margin-top: -8em;
        position: static;
    }

    #batch-translation-select {
      border: none;
      outline: none;
      background-color: transparent;
      width: auto;
      height: auto; 
      position: static; 
      transform: none; 
      z-index: 999;
      margin-top: 8em;
    }
    

    
    #input {
        background-color: transparent;
        display: none;
    }
    #translated-column {
        margin-top: 20px;
    }

    #translated-list {
        margin-top: -4.8em;
        text-decoration: none;
        list-style: none;
        white-space: nowrap;
    }
    #form-group input {
        display: none;
    }

    option {
      background-color: #0A0A0A;
      font-weight: lighter;
    }

    #translated-list li {
      display: inline-block;
      background-color: transparent;
    }

</style>

<div id="container">
    <form id="form-group">
    <input id="input" >
    <select class="language-select"></select>
    </form>
    <div id="translated-column">
        <div id="translated-list"></div>
    </div>
</div>
`;

class OuterbasePluginConfig_$PLUGIN_ID {
  constructor(object) {
    this.targetLanguage = "en";
    this.columnName = "";
    this.cellId = "";
    if (object) {
      this.targetLanguage = object.targetLanguage || this.targetLanguage;
      this.columnName = object.columnName || this.columnName;
      this.cellId = object.cellId || this.cellId;
    }
  }

  toJSON() {
    return {
      targetLanguage: this.targetLanguage,
      columnName: this.columnName,
      cellId: this.cellId,
    };
  }
}

class OuterbasePluginCell_$PLUGIN_ID extends HTMLElement {
  static get observedAttributes() {
    return privileges;
  }

  config = new OuterbasePluginConfig_$PLUGIN_ID({});
  supportedLanguages = [];
  batchTranslationLanguage = "en";
  batchData = [];
  lastTranslatedText = "";

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.appendChild(templateCell_$PLUGIN_ID.content.cloneNode(true));
    const container = this.shadow.querySelector("#container");
    container.insertBefore(batchTranslationCheckbox, container.firstChild);
    container.insertBefore(batchTranslationSelect, container.firstChild);

    const inputElement = this.shadow.getElementById("input");
    console.log("cell input: ", inputElement);

    inputElement.value = this.getAttribute("cellValue");
  }

  async connectedCallback() {
    const configAttribute = this.getAttribute("configuration");
    if (configAttribute) {
      this.config = new OuterbasePluginConfig_$PLUGIN_ID(
        JSON.parse(configAttribute)
      );
    }

    const inputElement = this.shadow.getElementById("input");
    if (inputElement) {
      inputElement.value = this.getAttribute("cellValue");
    }

    const translatedList = this.shadow.getElementById("translated-list");
    const languageSelect = this.shadow.querySelector(".language-select");
    const batchLanguageSelect = this.shadow.querySelector(
      "#batch-translation-select"
    );

    this.populateLanguageDropdown(languageSelect);
    this.populateLanguageDropdown(batchTranslationSelect);

    const noneOption = document.createElement("option");
    noneOption.value = "none";
    noneOption.textContent = "None";
    batchTranslationSelect.appendChild(noneOption);

    languageSelect.addEventListener("change", async () => {
      const targetLanguage = languageSelect.value;
      const isBatchTranslation = batchTranslationCheckbox.checked;
      const batchTargetLanguage = batchLanguageSelect.value;

      if (isBatchTranslation && batchTargetLanguage) {
        await this.translateBatch(batchTargetLanguage, translatedList);
      } else {
        await this.translateCell(targetLanguage, translatedList);
      }

      languageSelect.selectedIndex = -1;
    });

    batchTranslationCheckbox.addEventListener("change", () => {
      const isBatchTranslation = batchTranslationCheckbox.checked;
      this.handleTranslationModeChange(isBatchTranslation);

      if (isBatchTranslation) {
        batchTranslationSelect.size = 4;
        batchTranslationSelect.style.width = "30vw";
        batchTranslationSelect.style.height = "60vh";
      } else {
        batchTranslationSelect.size = 1;
      }
    });

    batchTranslationSelect.addEventListener("change", async () => {
      const isBatchTranslation = batchTranslationCheckbox.checked;
      const batchTargetLanguage = batchTranslationSelect.value;
    
      if (batchTargetLanguage === "none") {
        batchTranslationCheckbox.checked = false;
        this.handleTranslationModeChange(false);
        translatedList.innerHTML = ""; 
      } else {
        if (batchTargetLanguage) {
          batchTranslationCheckbox.checked = true;
        }
    
        if (isBatchTranslation && batchTargetLanguage) {
          this.batchTranslationLanguage = batchTargetLanguage;
    
          this.batchData = [];
    
          const cellValue = this.shadow.getElementById("input").value;
          if (cellValue.trim().length > 0) {
            this.batchData.push(cellValue);
          }
    
          if (this.batchData.length > 0) {
            await this.translateBatch(
              this.batchTranslationLanguage,
              translatedList
            );
          } else {
            translatedList.innerHTML = "No text for batch translation.";
          }
        } else {
          this.batchData = [];
          translatedList.innerHTML = "";
          await this.translateCell(languageSelect.value, translatedList); 
        }
      }
    
      batchTranslationSelect.selectedIndex = -1;
    });
  }

  async populateLanguageDropdown(selectElement) {
    try {
      const languageEndpoint = `https://translation.googleapis.com/language/translate/v2/languages?key=${googleTranslateAPI}`;

      const response = await fetch(languageEndpoint);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch supported languages: ${response.statusText}`
        );
      }

      const data = await response.json();
      const languages = data.data.languages;

      selectElement.innerHTML = "";
      const placeholderOption = document.createElement("option");
      selectElement.appendChild(placeholderOption);

      languages.forEach((language) => {
        const option = document.createElement("option");
        option.value = language.language;
        option.textContent = new Intl.DisplayNames(["en"], {
          type: "language",
        }).of(option.value);
        selectElement.appendChild(option);
      });

      this.supportedLanguages = languages;
    } catch (error) {
      console.error("Error fetching supported languages:", error);
    }
  }

  async translateBatch(targetLanguage, listElement) {
    try {
      listElement.innerHTML = "";

      const uniqueBatchData = [...new Set(this.batchData)];

      const translatedBatch = await Promise.all(
        uniqueBatchData.map(async (text) => {
          try {
            const translatedText = await this.translateText(
              text,
              targetLanguage
            );
            return translatedText;
          } catch (error) {
            console.error(`Error translating text in batch: ${error}`);
            return "Translation Error";
          }
        })
      );

      this.displayTranslatedBatch(translatedBatch, listElement);
    } catch (error) {
      console.error("Error during batch translation:", error);
      listElement.innerHTML = "Error occurred during batch translation";
    }
  }

  async translateCell(targetLanguage, listElement) {
    try {
      const textToTranslate = this.shadow.getElementById("input").value;

      if (textToTranslate !== this.lastTranslatedText) {
        if (listElement.lastChild) {
          listElement.removeChild(listElement.lastChild);
        }

        this.hideSelectedLanguage(targetLanguage);

        const translatedText = await this.translateText(
          textToTranslate,
          targetLanguage
        );

        this.displayTranslatedText(translatedText, listElement);

        this.lastTranslatedText = textToTranslate;
      }
    } catch (error) {
      console.error("Error during cell-by-cell translation:", error);
      listElement.innerHTML = "Error occurred during cell-by-cell translation";
    }
  }

  hideSelectedLanguage(targetLanguage) {
    const languageSelect = this.shadow.querySelector(".language-select");
    const options = languageSelect.options;

    for (let i = 0; i < options.length; i++) {
      if (options[i].value === targetLanguage) {
        options[i].style.display = "none";
      } else {
        options[i].style.display = "block";
      }
    }
  }

  hideOriginalText(listElement, targetLanguage) {
    const originalTextItem = listElement.querySelector(".original-text");
    if (originalTextItem) {
      const languageSelect = this.shadow.querySelector(".language-select");
      const selectedLanguage = languageSelect.value;

      if (selectedLanguage === targetLanguage) {
        originalTextItem.style.display = "none";
      }
    }
  }

  displayOriginalText(originalText, listElement) {
    const originalTextItem = document.createElement("li");
    originalTextItem.textContent = `${originalText}`;
    listElement.appendChild(originalTextItem);
  }

  async translateText(text, targetLanguage) {
    try {
      console.log("Text to translate:", text);
      console.log("Target language:", targetLanguage);
      const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${googleTranslateAPI}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(
          `Translation request failed with status: ${response.status}, Error Message: ${errorResponse.error.message}`
        );
      }

      const data = await response.json();

      if (
        data.data &&
        data.data.translations &&
        data.data.translations.length > 0 &&
        data.data.translations[0].translatedText
      ) {
        return data.data.translations[0].translatedText;
      } else {
        throw Error("Invalid response from translation API");
      }
    } catch (error) {
      console.error(`Error translating text: ${error}`);
      console.error("API Error Response:", await response.text());
      throw error;
    }
  }

  displayTranslatedText(translatedText, listElement) {
    listElement.innerHTML = "";
    const listItem = document.createElement("li");
    listItem.textContent = translatedText;
    listElement.appendChild(listItem);
  }

  displayTranslatedBatch(translatedBatch, listElement) {
    listElement.innerHTML = "";

    for (const value of translatedBatch) {
      const listItem = document.createElement("li");
      listItem.textContent = value;
      listElement.appendChild(listItem);
    }

    listElement.scrollTop = listElement.scrollHeight;
  }

  handleTranslationModeChange(isBatchTranslation) {
    const inputElement = this.shadow.getElementById("input");

    if (isBatchTranslation) {
      inputElement.setAttribute("disabled", true);
    } else {
      inputElement.removeAttribute("disabled");
    }
  }
}

window.customElements.define(
  "outerbase-plugin-cell-$PLUGIN_ID",
  OuterbasePluginCell_$PLUGIN_ID
);