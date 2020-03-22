// load routes
const loadRoute = (route) => {
    let routes = getRoutes();
    $("#iframeContent").attr("src", routes[route].path);
}

// handle navbar title changing
const updateNavbarTitle = () => {
    let path = document.getElementById("iframeContent").contentWindow.location.href;

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
        "noauth": {
            title: "Auth Failure",
            path: "./pages/noauth.html"
        }
    }
}