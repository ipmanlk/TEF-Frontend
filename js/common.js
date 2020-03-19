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