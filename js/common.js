// validate element values using given regular expressions
const validateElementValue = (elementValidationInfo) => {

    // create selector name for ui element id
    const selector = `#${elementValidationInfo.attribute}`;

    // get value of element id
    const value = $(selector).val();

    // create RegExp object from regex string
    const regex = new RegExp(elementValidationInfo.regex);


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

// general event listeners based on regexes and attributes received from server
const registerGeneralEventListeners = (validationInfo) => {
    // realtime validation
    validationInfo.forEach(vi => {
        $(`#${vi.attribute}`).on("keyup change", () => {
            validateElementValue(vi);
        });
    });

    // prevent from submissions
    $("form").on("submit", (e) => e.preventDefault());
}

// create image url from buffer data recived from server
const getImageURLfromBuffer = (buffer) => {
    const arrayBufferView = new Uint8Array(buffer.data);
    const blob = new Blob([arrayBufferView], { type: "image/png" });
    const urlCreator = window.URL || window.webkitURL;
    const imageUrl = urlCreator.createObjectURL(blob);
    return imageUrl;
}

// send http requests and handle errors
const request = (path, method, data = {}, isFormData = false) => {
    return new Promise((resolve, reject) => {
        let options;
        options = {
            type: method,
            url: `http://localhost:3000${path}`,
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