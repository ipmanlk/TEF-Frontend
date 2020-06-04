// load routes
const loadRoute = (route) => {

    let routes = getRoutes();

    // if route doesn't exist
    if (!routes[route]) {
        window.alert("This route doesnt exist (404)");
        return;
    }

    $("#iframeMain").attr("src", routes[route].path);

    // hide open modals
    $(".modal").modal("hide");

    // scroll to top
    $("html, body").animate({ scrollTop: 0 }, "slow");

    // change url
    history.pushState({}, null, `?page=${route}`);
}

// handle iframe src changing
const updateRouteInfo = () => {
    let path = document.getElementById("iframeMain").contentWindow.location.href;

    path = `.${path.substring(path.indexOf("/pages"), path.length)}`;

    // handle non authenticated cases
    if (path.indexOf("noauth.html") > -1) {
        window.location = "../login.html";
        return;
    }

    // proceed with title update
    let routes = getRoutes();
    routes = Object.values(routes).filter(route => route.path == path);
    $("#txtNavbarTitle").text(routes[0].title);

    // make modal functions available inside the iframeMain
    document.getElementById("iframeMain").contentWindow.mainWindow = {
        showOutputModal,
        showConfirmModal,
        showOutputToast
    }
}

const getRoutes = () => {
    return {
        "dashboard": {
            title: "Dashboard",
            path: "./pages/dashboard/dashboard.html"
        },
        "employee": {
            title: "Employee View",
            path: "./pages/employee/employee.html"
        },
        "user": {
            title: "User View",
            path: "./pages/user/user.html"
        },
        "privilege": {
            title: "Privileges View",
            path: "./pages/privilege/privilege.html"
        },
        "role": {
            title: "Role View",
            path: "./pages/role/role.html"
        },
        "noauth": {
            title: "Auth Failure",
            path: "./pages/noauth.html"
        }
    }
}