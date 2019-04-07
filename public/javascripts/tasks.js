var picNumber = 1;

$(".nextDiv").click(function() {
    picNumber++;
    if (picNumber > 3) picNumber = 1; // Change 3 to how many pictures there are.
    $(".pic img").attr("src", "images/portfolio/webdesign/webd" + picNumber + ".jpg");
});
$(".prevDiv").click(function() {
    picNumber--;
    if (picNumber < 1) picNumber = 3; // Change 3 to how many pictures there are.
    $(".pic img").attr("src", "images/portfolio/webdesign/webd" + picNumber + ".jpg");
});