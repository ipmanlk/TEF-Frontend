/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

$(document).ready(() => {
    setTimeout(loadProfile, 1000);
});

const loadProfile = () => {
    const profile = mainWindow.tempData.profile;

    // fill profile values to inputs
    $("#number").val(profile.employee.number);
    $("#fullName").val(profile.employee.fullName);
    $("#callingName").val(profile.employee.callingName);
    $("#gender").val(profile.employee.gender.name);
    $("#civilStatus").val(profile.employee.civilStatus.name);
    $("#nic").val(profile.employee.nic);
    $("#address").val(profile.employee.address);
    $("#mobile").val(profile.employee.mobile);
    $("#land").val(profile.employee.land);
    $("#designation").val(profile.employee.designation.name);
    $("#doassignment").val(profile.employee.doassignment);
    $("#description").val(profile.employee.description);
    $("#employeeStatus").val(profile.employee.employeeStatus.name);

    // get image url from buffer
    const avatarUrl = ImageUtil.getURLfromBuffer(profile.employee.photo);

    $("#photo").attr("src", avatarUrl);

    // calculate dob
    const dateOfBirth = NIClkUtil.getDOB(profile.employee.nic);

    $("#dobirth").val(dateOfBirth);

    // make form readonly
    $(`#mainForm .form-group`).children().each((i, el) => {        
        $(el).attr("readonly", true);
        $(el).attr("disabled", true);
        $(el).addClass("no-outline");
    });
}