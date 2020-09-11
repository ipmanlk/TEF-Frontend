class Form {
    constructor(formId, formTitle, permission, validationInfoObject = {}, dropdownInfoArray = [], actionBinderObject = {}) {
        this.formId = formId;
        this.formTitle = formTitle;
        this.dropdownIds = [];
        this.dropdownInfoArray = dropdownInfoArray;
        this.selectedEntry = undefined;
        this.permission = permission;
        this.validationInfoObject = validationInfoObject;

        // provide freedback when user interact with form elements
        validationInfoObject.forEach(vi => {
            $(`#${formId} #${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });

        // load form dropdowns
        dropdownInfoArray.forEach(di => {
            // get dropdown data using get request
            Request.send(di.route, "GET").then(res => {

                // remove current html inside each dropbdorpdownox
                $(`#${this.formId} #${di.id}`).empty();

                // add each entry to relavent dorpdown
                res.data.forEach(entry => {
                    $(`#${this.formId} #${di.id}`).append(`<option value="${entry.id}">${entry.name}</option>`);
                });

                // save dorpdown id for later use
                this.dropdownIds.push(di.id);
            });
        });

        // check permissions
        if (permission[0] == 0) {
            $(`#${formId} .btnFmAdd`).hide();
        }

        if (permission[2] == 0) {
            $(`#${formId} .btnFmUpdate`).hide();
        }

        if (permission[3] == 0) {
            $(`#${formId} .btnFmDelete`).hide();
        }

        // set event listeners
        // events: form
        $(`#${formId}`).on("submit", (e) => e.preventDefault());

        // events: buttons
        $(`#${formId} .btnFmAdd`).on("click", () => {
            actionBinderObject.addEntry.call(this);
        });

        $(`#${formId} .btnFmUpdate`).on("click", () => {
            actionBinderObject.updateEntry.call(this);
        });

        $(`#${formId} .btnFmDelete`).on("click", () => {
            actionBinderObject.deleteEntry.call(this, this.selectedEntry.id);
        });

        $(`#${formId} .btnFmReset`).on("click", () => {
            this.reset.call(this);
        });

        $(`#${formId} .btnFmPrint`).on("click", () => {
            this.print.call(this);
        });

        this.loadAddons();
    }

    loadAddons() {
    }

    validateElementValue(elementValidationInfo) {
        // create selector name for ui element id
        const selector = `#${this.formId} #${elementValidationInfo.attribute}`;

        // get value of element id
        const value = $(selector).val();

        // create RegExp object from regex string
        const regex = new RegExp(elementValidationInfo.regex);

        // if value is optional and not set, ignore
        if (elementValidationInfo.optional && value.trim() == "") {
            $(selector).parent().removeClass("has-error has-success");
            $(selector).parent().children("span").remove();
            return true;
        }

        // check form values with each regex
        if (!regex.test(value)) {
            $(selector).parent().removeClass("has-success");
            $(selector).parent().addClass("has-error");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`);
            return false;
        } else {
            $(selector).parent().removeClass("has-error");
            $(selector).parent().addClass("has-success");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`);
            return true;
        }
    }

    print() {
        let table = `<table class="table table-striped">
        <tr><td colspan="2"><h3>${this.formTitle}</h3></tr>`
        $(`#${this.formId} label`).each((i, el) => {

            // ignore hidden elements
            if ($(el).parent().is(":hidden")) return;

            let type;
            let label, data;

            const firstChild = $(el);
            let secondChild = $(el).next();

            // fix for required input labels
            if (secondChild.prop('nodeName') == "SPAN" && secondChild.text().trim() == "*") {
                secondChild = $(el).next().next();
            }

            if (secondChild.prop('nodeName') == "INPUT") {
                type = "text";
                label = firstChild.text();
                data = secondChild.val();
            }

            if ($(secondChild).prop('nodeName') == "SELECT") {
                type = "text";
                label = firstChild.text();
                data = $(`#${secondChild.attr("id")} option:selected`).text();
            }

            if ($(secondChild).prop('nodeName') == "IMG") {
                type = "image";
                label = firstChild.text();
                data = `<img src="${secondChild.attr("src")}" width="100px"></img>`
            }

            if (!type) return;

            // fix for empty data items
            if (data.trim() == "") data = "Not Provided";

            table += `<tr>
                        <td style="width:30%">${label.replace("*", "")}</td>
                        <td>${data}</td>
                    <tr>`
        });

        table += "</table>";

        // create new window and print the table
        const stylesheet = "http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
        const win = window.open("", "Print", "width=500,height=300");
        win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${table}</body></html>`);
        setTimeout(() => {
            win.document.close();
            win.print();
            win.close();
        }, 500);
    }

    reset() {
        $(`#${this.formId}`).trigger("reset");
        $(`#${this.formId} .form-group`).removeClass("has-error has-success");
        $(`#${this.formId} .form-group`).children(".form-control-feedback").remove();
        $(`#${this.formId} .photo-input`).attr("src", "../../img/placeholder.png");
        this.selectedEntry = undefined;

        this.setButtionsVisibility("add");

        this.disableReadOnly();
    }

    enableReadOnly() {
        $(`#${this.formId} .form-group`).removeClass("has-error has-success");
        $(`#${this.formId} .form-group`).children(".form-control-feedback").remove();
        $(`#${this.formId} .form-group`).addClass("read-only no-outline");
        this.setButtionsVisibility("view");
    }

    disableReadOnly() {
        console.log("readonly disabled");
        $(`#${this.formId} .form-group`).removeClass("read-only no-outline");
    }

    // load entry from database to the form
    loadEntry(entry) {
        this.reset();
        this.selectedEntry = entry;

        // load entry values to form
        Object.keys(entry).forEach(key => {
            // ignore dropdown values
            if (this.dropdownIds.indexOf(key) !== -1) return;

            // set value in the form input
            $(`#${this.formId} #${key}`).val(entry[key]);
        });

        // select dropdown values
        this.dropdownIds.forEach(dropdownId => {
            this.selectDropdownOptionByValue(dropdownId, entry[dropdownId]);
        });

        this.setButtionsVisibility("edit");

        // show, hide delete buttion based on status field 
        const statusFields = this.dropdownInfoArray.filter(di => di.statusField);

        if (statusFields.length == 1) {
            const dropdownId = statusFields[0].id;
            if ($(`#${this.formId} #${dropdownId} option:selected`).text() == "Deleted") {
                this.hideElement(".btnFmDelete");
            }
        }
    }

    // show suitable buttions for view / edit / add
    setButtionsVisibility(action) {
        switch (action) {
            case "view":
                this.hideElement(".btnFmAdd");
                this.hideElement(".btnFmUpdate");
                this.hideElement(".btnFmDelete");
                this.hideElement(".btnFmReset");
                this.showElement(".btnFmPrint");
                break;

            case "edit":
                this.hideElement(".btnFmAdd");
                this.hideElement(".btnFmPrint");
                if (this.permission[2] !== 0) this.showElement(".btnFmUpdate");
                if (this.permission[3] !== 0) this.showElement(".btnFmDelete");
                this.showElement(".btnFmReset");
                break;

            case "add":
                this.hideElement(".btnFmUpdate");
                this.hideElement(".btnFmDelete");
                this.hideElement(".btnFmPrint");
                if (this.permission[0] !== 0) this.showElement(".btnFmAdd");
                this.showElement(".btnFmReset");
                break;
        }
    }

    // hide an element placed within the form
    hideElement(selector) {
        $(`#${this.formId} ${selector}`).hide();
    }

    // show an element placed within the form
    showElement(selector) {
        $(`#${this.formId} ${selector}`).show();
    }

    // check if form is valid. returns an object with status & data
    async validateForm() {
        let errors = "";
        const entry = {};

        // Loop through validation info items (vi) and check it's value using regexes
        for (let vi of this.validationInfoObject) {
            // element id is equal to database attribute name
            const elementId = vi.attribute;

            // validation status of the form
            let isValid = false;

            // get jquery object for element with current id
            const element = $(`#${this.formId} #${elementId}`);

            // handle file uploads (base64) 
            if (element.attr("type") == "file") {

                // when file is selected
                if (element.prop("files")[0]) {
                    try {
                        entry[elementId] = await MiscUtil.getBase64FromFile(element.prop("files")[0]);
                        isValid = this.validateElementValue(vi);
                    } catch (error) {
                        console.log("Base64 from file error", error);
                    }

                    // if file is not set, check if selected entry (editing entry) has one
                } else if (this.selectedEntry !== undefined && this.selectedEntry[elementId]) {
                    entry[elementId] = false;  // set false to mark it as not changed
                    isValid = true;
                } else {
                    isValid = this.validateElementValue(vi);
                }
            } else {
                isValid = this.validateElementValue(vi);
            }

            // check for errors and add to entry object
            if (!isValid) {
                errors += `${vi.error}<br/>`
            } else {
                // ignore if input is a file (base64 is already set above)
                if ((element.attr("type") == "file")) continue;

                // set values for entry object
                if (Array.isArray(element.val())) {
                    // multiselect value is an array
                    entry[elementId] = element.val();
                } else {
                    entry[elementId] = element.val().trim() == "" ? null : element.val();
                }
            }
        }

        // if there aren't any errors
        if (errors == "") {
            return {
                status: true,
                data: entry
            }
        }

        // if there are errors
        return {
            status: false,
            data: errors
        }
    }

    // check if form data has changed compared to selected entry. returns a boolean
    async hasDataChanged() {
        const { status, data } = await this.validateForm();

        // if there are errors
        if (!status) {
            throw `Validate form returned errors! ${data}`;
        }

        // new entry object
        let newEntryObj = data;
        const selectedEntry = this.selectedEntry;

        // check if any of the data in entry has changed
        let dataHasChanged = false;

        for (let key in newEntryObj) {

            const isFileInput = $(`#${this.formId} #${key}`).attr("type") == "file";

            // when file hasn't changed
            if (isFileInput && newEntryObj[key] == false && this.selectedEntry[key] !== false) {
                console.log("File hasn't changed: ", key);
                continue;
            }

            // compare selected entry and edited entry values
            try {
                // if selected entry has null values, change them to empty strings
                selectedEntry[key] = (selectedEntry[key] == null) ? "" : selectedEntry[key];
                // if new entry obj has null values, change them to empty strings
                newEntryObj[key] = (newEntryObj[key] == null) ? "" : newEntryObj[key];
                // compare values in objects
                if (newEntryObj[key] !== selectedEntry[key].toString()) {
                    dataHasChanged = true;
                }
            } catch (error) {
                console.log("Compare error!. Key: ", key);
            }
        }

        return dataHasChanged;
    }

    // select an option in a dropdown using value
    selectDropdownOptionByValue(dropdownId, optionValue) {
        $(`#${this.formId} #${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the value of current option element
            const currentValue = $(this).attr("value");

            // check if current value is equal to given value
            if (currentValue == optionValue) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // select an option in a dropdown using text
    selectDropdownOptionByText(dropdownId, optionText) {
        $(`#${this.formId} #${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the text of current option element
            const currentText = $(this).text();

            // check if current text is equal to given text
            if (currentText == optionText) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // set attributes in validation info object as required
    setValidationAttributesRequired(attributues = []) {
        this.validationInfoObject.forEach(vi => {
            if (attributues.includes(vi.attribute)) {
                delete vi.optional;
            }
        });

        this.updateFormInputEventListeners();
    }

    // set attributes in validation info object as optional
    setValidationAttributesOptional(attributues = []) {
        this.validationInfoObject.forEach(vi => {
            if (attributues.includes(vi.attribute)) {
                vi["optional"] = true;
            }
        });

        this.updateFormInputEventListeners();
    }

    // update form input event listeners
    updateFormInputEventListeners() {
        this.validationInfoObject.forEach(vi => {
            // remove existing listeners
            $(`#${this.formId} #${vi.attribute}`).off();
            // add new listener
            $(`#${this.formId} #${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });
    }
}

class FormUtil {
    static validateElementValue(elementValidationInfo) {
        // create selector name for ui element id
        const selector = `#${elementValidationInfo.attribute}`;

        // get value of element id
        const value = $(selector).val();

        // create RegExp object from regex string
        const regex = new RegExp(elementValidationInfo.regex);

        // if value is optional and not set, ignore
        if (elementValidationInfo.optional && value.trim() == "") {
            $(selector).parent().removeClass("has-error has-success");
            $(selector).parent().children("span").remove();
            return true;
        }

        // check form values with each regex
        if (!regex.test(value)) {
            $(selector).parent().removeClass("has-success");
            $(selector).parent().addClass("has-error");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`);
            return false;
        } else {
            $(selector).parent().removeClass("has-error");
            $(selector).parent().addClass("has-success");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`);
            return true;
        }
    }

    static enableRealtimeValidation(validationInfo) {
        // provide freedback when user interact with form elements
        validationInfo.forEach(vi => {
            $(`#${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });
    }

    // make an form read only
    static setReadOnly(selector, readOnly) {
        if (readOnly) {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", true);
                    $(el).attr("disabled", true);
                    $(el).addClass("no-outline");
                    $(".form-group").removeClass("has-error has-success");
                    $(".form-group").children(".form-control-feedback").remove();
                }
            });

        } else {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", false);
                    $(el).attr("disabled", false);
                    $(el).removeClass("no-outline");
                }
            });
        }
    }

    // print a form
    static printForm(formId, title) {
        let table = `<table class="table table-striped">
        <tr><td colspan="2"><h3>${title}</h3></tr>`
        $(`#${formId} label`).each((i, el) => {
            let type;
            let label, data;

            const firstChild = $(el);
            const secondChild = $(el).next();

            console.log($(secondChild).prop('id'));
            if ($(secondChild).prop('nodeName') == "INPUT") {
                type = "text";
                label = $(firstChild).text();
                data = $(secondChild).val();
            }

            if ($(secondChild).prop('nodeName') == "SELECT") {
                type = "text";
                label = $(firstChild).text();
                data = $(`#${$(secondChild).attr("id")} option:selected`).text();
            }

            if ($(secondChild).prop('nodeName') == "IMG") {
                type = "image";
                label = $(firstChild).text();
                data = `<img src="${$(secondChild).attr("src")}" width="100px"></img>`
            }

            if (!type) return;

            table += `<tr>
                        <td style="width:30%">${label.replace("*", "")}</td>
                        <td>${data}</td>
                    <tr>`
        });

        table += "</table>";

        // create new window and print the table
        const stylesheet = "http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
        const win = window.open("", "Print", "width=500,height=300");
        win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${table}</body></html>`);
        setTimeout(() => {
            win.document.close();
            win.print();
            win.close();
        }, 500);
    }

    // select an option in a dropdown using value
    static selectDropdownOptionByValue(dropdownId, optionValue) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the value of current option element
            const currentValue = $(this).attr("value");

            // check if current value is equal to given value
            if (currentValue == optionValue) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // select an option in a dropdown using text
    static selectDropdownOptionByText(dropdownId, optionText) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the text of current option element
            const currentText = $(this).text();

            // check if current text is equal to given text
            if (currentText == optionText) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // show hide approrpiate buttons
    static setButtionsVisibility(formId, permission = [], action) {
        switch (action) {
            case "view":
                $(`#${formId} .btnFmAdd`).hide();
                $(`#${formId} .btnFmUpdate`).hide();
                $(`#${formId} .btnFmDelete`).hide();
                $(`#${formId} .btnFmReset`).hide();
                $(`#${formId} .btnFmPrint`).show();
                break;

            case "edit":
                $(`#${formId} .btnFmAdd`).hide();
                $(`#${formId} .btnFmPrint`).hide();
                if (permission[2] !== 0) $(`#${formId} .btnFmUpdate`).show();
                if (permission[3] !== 0) $(`#${formId} .btnFmDelete`).show();
                $(`#${formId} .btnFmReset`).show();
                break;

            case "add":
                $(`#${formId} .btnFmUpdate`).hide();
                $(`#${formId} .btnFmDelete`).hide();
                $(`#${formId} .btnFmPrint`).hide();
                $(`#${formId} .btnFmReset`).show();
                if (permission[0] !== 0) $(`#${formId} .btnFmAdd`).show();
                break;
        }
    }

    static enableReadOnly(formId) {
        $(`#${formId} .form-group`).addClass("read-only");
    }

    static disableReadOnly(formId) {
        $(`#${formId} .form-group`).removeClass("read-only");
    }
}

class MiscUtil {
    static getURLfromBuffer(buffer) {
        // create image url from buffer data recived from server
        const arrayBufferView = new Uint8Array(buffer.data);
        const blob = new Blob([arrayBufferView], { type: "image/png" });
        const urlCreator = window.URL || window.webkitURL;
        const imageUrl = urlCreator.createObjectURL(blob);
        return imageUrl;
    }

    static getBase64FromFile(file) {
        // create a base64 string from a file object
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

class Request {
    static send(path, method, data = {}) {
        // this promise will never reject to prevent unhandled promise rejections
        return new Promise((resolve, reject) => {

            // options for sending http requests
            const options = {
                type: method,
                contentType: "application/json; charset=utf-8",
                url: `http://localhost:3000${path}`,
                data: data,
                dataType: "json"
            }

            // send json strings on POST, PUT & DELETE requests
            if (method == "POST" || method == "PUT") {
                options.data = JSON.stringify(data);
            }

            // don't send a body for delete reqeusts
            if (method == "DELETE") {
                delete options["data"];
                options["url"] += `?${jQuery.param(data)}`;
            }

            // create a new request with options
            const req = $.ajax(options);

            // when request is complete
            req.done((res) => {

                // if response doesn't have a status propery, ignore it
                if (res.status == undefined) return;

                // if response status is true, resovle the promoise
                if (res.status) {
                    resolve(res);

                } else {
                    // log the response
                    console.log(res);

                    // show error modal when status of the response is false
                    try {
                        let outputMsg;

                        if (res.type == "input") {
                            outputMsg = `${res.msg}`;
                            mainWindow.showOutputModal("Error", outputMsg, "sm");
                        } else {
                            outputMsg = `${res.msg}<br/><br/><h4>Log:</h4><div class="well">Route: ${options.url} <br><br>Response: ${JSON.stringify(res)}</div>`;
                            mainWindow.showOutputModal("Error", outputMsg, "lg");
                        }

                        // check if this is an authentication error (when logged out)
                        if (res.type == "auth") {
                            window.location = "noauth.html"
                        }
                    } catch (e) { }

                    // resolve the promise with false status
                    resolve({ status: false });
                }
            });

            // if request failed to complete
            req.fail((jqXHR, textStatus) => {
                // if no json response is recived, ignore it
                if (jqXHR.responseJSON == undefined) return;

                // show error modal 
                try {
                    mainWindow.showOutputModal("Error", jqXHR.responseJSON.msg);

                    // check if this is an authentication error (when logged out or session empty)
                    if (jqXHR.responseJSON.type == "auth") {
                        window.location = "noauth.html"
                    }
                } catch (e) {

                    // if no error msg is present to show, just show a generic error modal
                    console.log(e);
                    mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
                }

                // resolve the promise with false status
                resolve({ status: false });
            });
        });
    }
}

// Misc functions for useful tasks

// capitalazie first letters of words in a given string
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// get today in inputtype=date compatible format
Date.prototype.today = function () {
    const now = new Date();
    const day = ("0" + now.getDate()).slice(-2);
    const month = ("0" + (now.getMonth() + 1)).slice(-2);
    return (now.getFullYear() + "-" + (month) + "-" + (day));
}