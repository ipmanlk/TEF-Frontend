$(document).ready(function () {

    // event listener for filtering cards
    $("#txtFilterCards").on("keyup change", (e) => {
        const keyword = e.target.value.trim().toLowerCase();

        // when keyword is empty
        if (keyword.trim() == "") {
            updateTiles();
            return;
        }

        $(".TILE").each((i, tile) => {
            // check h1 text inside tile
            const tileText = $(tile).first().first().first().text().toLowerCase();
            if (tileText.indexOf(keyword) > -1) {
                $(tile).show();
            } else {
                $(tile).hide();
            }
        });
    });

});

function updateTiles() {
    // show hide tiles based on privileges
    const privileges = mainWindow.tempData.privileges;

    // hide all tiles
    $(".TILE").hide();

    // show tiles based on privileges
    Object.keys(privileges).forEach(p => {
        $(`.${p}.TILE`).show();
    });
}