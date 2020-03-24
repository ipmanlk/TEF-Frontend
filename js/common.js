// validate element values using given regular expressions
const validateElementValue = (elementValidationInfo) => {

    // create selector name for ui element id
    const selector = `#${elementValidationInfo.attribute}`;

    // get value of element id
    const value = $(selector).val();

    // create RegExp object from regex string
    const regex = new RegExp(elementValidationInfo.regex);


    // for input file type 
    if ($(selector).attr("type") == "file" && value.trim() == "" && tempData.selectedEntry !== undefined) {
        return true;
    }

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

// create a base64 string from a file
const getBase64FromFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// send http requests and handle errors
const request = (path, method, data = {}) => {
    return new Promise((resolve, reject) => {
        const options = {
            type: method,
            contentType: 'application/json; charset=utf-8',
            url: `http://localhost:3000${path}`,
            data: data,
            dataType: "json"
        }

        // send json on post bodies
        if (method == "POST" || method == "PUT") {
            options.data = JSON.stringify(data);
        }

        const req = $.ajax(options);

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