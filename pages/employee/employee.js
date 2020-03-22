let validationInfo;

// when dom is ready
$(document).ready(async function () {
    await loadValidationInfo();
    await loadEmployeeTable();
    registerEventListeners();
});

const loadValidationInfo = async() => {
    try {
        let validationData = await request("http://localhost:3000/api/regex/EMPLOYEE", "GET");
        validationInfo = validationData.data;
    } catch (e) {
        return;
    }
}

const loadEmployeeTable = async () => {

    // get employee data from server
    let employeeData;

    try {
        employeeData = await request("http://localhost:3000/api/employees", "GET");
    } catch (e) {
        return;
    }

    // check if server returned an error
    if (!employeeData.status) {
        window.alert(employeeData.msg);
        return;
    }

    // map data to support data table structure
    let data = employeeData.data.map(employee => {
        return {
            id: employee.id,
            number: employee.number,
            fullName: employee.fullName,
            callingName: employee.callingName,
            dobirth: employee.dobirth,
            nic: employee.nic,
            address: employee.address,
            mobile: employee.mobile,
            land: employee.land,
            doassignment: employee.doassignment,
            gender: employee.gender.name,
            designation: employee.designation.name,
            civilStatus: employee.civilStatus.name,
            employeeStatus: employee.employeeStatus.name,
            edit: `<button class="btn btn-warning btn-sm">Edit</button>`,
            delete: `<button class="btn btn-danger btn-sm">Delete</button>`
        }
    });

    // init data table
    $("#mainTable").DataTable({
        dom: "Bfrtip",
        buttons: [
            "copy", "csv", "excel", "pdf", "print"
        ],
        data: data,
        "columns": [
            { "data": "id" },
            { "data": "number" },
            { "data": "nic" },
            { "data": "fullName" },
            { "data": "callingName" },
            { "data": "dobirth" },
            { "data": "mobile" },
            { "data": "land" },
            { "data": "address" },
            { "data": "designation" },
            { "data": "doassignment" },
            { "data": "employeeStatus" },
            { "data": "edit" },
            { "data": "delete" }
        ],
        responsive: true
    });
}

const registerEventListeners = () => {
    // realtime validation
    validationInfo.forEach(vi => {
        $(`#${vi.attribute}`).on("keyup change", () => {
            validateElementValue(vi.attribute);
        });
    })

    // handle image upload preview
    $("#filePhoto").on("change", (event) => {
        if (filePhoto.files && filePhoto.files[0]) {
            filePhotoPreview.src = URL.createObjectURL(event.target.files[0]);
        }
    });

    // fill date of birth from nic
    $("#nic").on("change keyup", (e) => {
        let { dateOfBirth } = getNICinfo(e.target.value);
        $("#dobirth").val(dateOfBirth);
    });

    // prevent from submission
    $("form").on("submit", (e) => e.preventDefault());


    // for form buttons
    $("#btnFmAdd").on("click", addEmployee);
}

const validateElementValue = (elementId) => {
    // get values need for validation
    let selector = `#${elementId}`;
    let value = $(selector).val();
    let elementValidationInfo = validationInfo.find(vi => vi.attribute == elementId);
    
    let regex = new RegExp(elementValidationInfo.regex);
    
    // for optional values
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

const validateForm = () => {
    let errors = "";
    let formData = {};

    // test each value and validate
    Object.keys(validationInfo).forEach(elementId => {
        let isValid = validateElementValue(elementId);

        if (!isValid) {
            errors += `${validationInfo[elementId].error}<br/>`
        } else {
            formData[validationInfo[elementId].mapping] = $(`#${elementId}`).val();
        }
    });
    console.log(formData);

    // if there aren't any errors
    if (errors == "") return formData;

    // if there are errors
    return errors;
}

const addEmployee = () => {
    const errors = validateForm();

    // if there are errors
    if (errors) {
        showOutputModal("Sorry!. Please fix these errors.", errors);
        return;
    }

    // proceed with adding
}

// modal for showing various outputs
const showOutputModal = (title, body) => {
    $("#modalOutputTitle").text(title);
    $("#modalOutputBody").html(body);
    $("#modalOutput").modal();
}

// http request sender
const request = (url, method, data = {}) => {
    return new Promise((resolve, reject) => {
        let req = $.ajax({
            url: url,
            method: method,
            data: data,
            dataType: "json"
        });

        req.done((res) => {
            if (res.status) {
                resolve(res);
            } else {
                showOutputModal("Error", res.msg);
                if (res.type == "auth") {
                    window.location = "noauth.html"
                }
            }
        });

        req.fail((jqXHR, textStatus) => {
            showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
        });
    });
}
