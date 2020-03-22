// validate element values using given regular expressions
const validateElementValue = (validationInfo, elementId) => {
    // create selector name for given id
    let selector = `#${elementId}`;
    // get value of given element
    let value = $(selector).val();
    // find regex for given elementId
    let elementValidationInfo = validationInfo.find(vi => vi.attribute == elementId);
    let regex = new RegExp(elementValidationInfo.regex);

    // if value is optional and not set, ignore
    if (elementValidationInfo.optional && value.trim() == "") {
        $(selector).parent().removeClass("has-error");
        $(selector).parent().removeClass("has-success");
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

// get regexes from module names
const getValidationInfo = async (moduleName) => {
    try {
        let validationData = await request(`http://localhost:3000/api/regex/${moduleName}`, "GET");
        return validationData.data;
    } catch (e) {
        return;
    }
}

// general event listeners based on regexes and attributes received from server
const registerGeneralEventListeners = (validationInfo) => {
    // realtime validation
    validationInfo.forEach(vi => {
        $(`#${vi.attribute}`).on("keyup change", () => {
            validateElementValue(validationInfo, vi.attribute);
        });
    });

    // prevent from submissions
    $("form").on("submit", (e) => e.preventDefault());
}


// send http requests and handle errors
const request = (url, method, data = {}, isFormData = false) => {
    return new Promise((resolve, reject) => {
        let options;
        options = {
            type: method,
            url: url,
            data: data,
            dataType: "json"
        }
        if (isFormData) {
            options.processData = false;
            options.contentType = false;
        }

        let req = $.ajax(options);

        req.done((res) => {
            if (res.status) {
                resolve(res);
            } else {
                mainWindow.showOutputModal("Error", res.msg);
                if (res.type == "auth") {
                    window.location = "noauth.html"
                }
            }
        });

        req.fail((jqXHR, textStatus) => {
            mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
            reject(textStatus);
        });
    });
}