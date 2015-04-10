$(document).on("submit", "div.process form", function() {
    var $form = $(this);
    var $process = $form.parent();

    // TODO: Show loading indicator
    $form.hide();

    $.ajax({
        url: this.action,
        method: "POST",
        timeout: 5000,
        success: function() {
            $process
                .append("<span class='processed'>(Already processed.)</span>");
            $process.closest(".cluster").addClass("processed");
        },
        error: function() {
            // TODO: Show error message
            $form.show();
        }
    });

    return false;
});