// load routes and change dashboard title appropriately
const loadRoute = (path) => {
    switch (path) {
        case "dashboard":
            path = "./pages/dashboard.html";
            $("#txtNavbarTitle").text("Dashboard");
            break;
        case "employee":
            path = "./pages/employee.html";
            $("#txtNavbarTitle").text("Employee View");
            break;
    }

    $("#iframeContent").attr("src", path);
}

// handle validation
const addRealtimeValidator = (inputElementId, regex) => {
    $(`#${inputElementId}`).on("keyup change", () => {
        const elementType = $(`#${inputElementId}`)[0].type;
        let isValid = true;
    
        switch (elementType) {
            case "text":
            case "textarea":
                let text = $(`#${inputElementId}`).val();
                if (text.trim() == "") {
                    isValid = undefined;
                } else {
                    isValid = regex.test(text) ? true : false;
                }
                break;
    
            default:
                break;
        }
    
        if (isValid) {
            $(`#${inputElementId}`).css("background-color", "lightgreen");
        } else if (isValid == false){
            $(`#${inputElementId}`).css("background-color", "red");
        } else {
            $(`#${inputElementId}`).css("background-color", "");
        }
    });
}