console.log("Check poll avail functionality");
let op = 0;
let alpha = "ABCDEFGHIJKLMNOP";
let show = 1;

$(function () {
    $('#add').click(function () {
        let main = $('#parent');
        console.log(main);
        if (op > 15) {
            alert("Enough option");
            return;
        }
        console.log("Add option clicked");
        op++;
        main.append(`
        <div id="optionBar" class="d-flex" style="height: 46px;background: rgba(190,245,242,0);margin-top: 10px;margin-left: 10%;width: 80%;">
            <div style="width: 10%;height: 100%;background: rgba(219,188,188,0);">
                <h1 style="margin-left: 21px;">${alpha.charAt(op)}</h1>
            </div>
            <div style="width: 85%;height: 100%;background: rgba(219,188,188,0);margin-left: 7px;">
                <input type="text" name="option" style="margin: 0px;margin-left: 40px;width: 100%;height: 100%;margin-top: 0px; font-size: 20px" placeholder="Option">
            </div>
        </div>`);
        $('#parent > div input:last-child').focus();
    });

    $('#remove').click(() => {
        if (op < 2) {
            alert("Min option reached op: " + op);
            return;
        }
        console.log("Remove option clicked");
        op--;
        $('#parent > div:last-child').remove();
    });
});

async function checkPoll() {
    console.log("Checking name of poll");
    var pollName = document.getElementById('pollName').value.trim();
    console.log(pollName);
    
    let okIcon = document.getElementById("ok");
    let crossIcon = document.getElementById("cross");
    let submitButton = document.getElementById("sub");

    if (!pollName) {
        okIcon.style.display = "none";
        crossIcon.style.display = "none";
        submitButton.disabled = true;
        return;
    }

    if (pollName.length < 2) {
        okIcon.style.display = "none";
        crossIcon.style.display = "inline";
        submitButton.disabled = true;
        return;
    }

    try {
        var response = await fetch("/checkPoll?name=" + encodeURIComponent(pollName));
        var data = await response.json();

        if (!data.exist) { // If poll name does NOT exist, allow submission
            okIcon.style.display = "inline";
            crossIcon.style.display = "none";
            submitButton.disabled = false;
        } else { // If poll name exists, prevent submission
            crossIcon.style.display = "inline";
            okIcon.style.display = "none";
            submitButton.disabled = true;
        }
    } catch (error) {
        console.error("Error checking poll name:", error);
        crossIcon.style.display = "inline";
        okIcon.style.display = "none";
        submitButton.disabled = true;
    }
}
