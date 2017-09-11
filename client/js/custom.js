

$('#editCoachModal').on('show.bs.modal', function (event) {
    
    var button      = $(event.relatedTarget) // Button that triggered the modal
    var coachId     = button.data('id') // Extract info from data-* attributes
    var coachRow    = button.closest('tr');
    
    var name            = coachRow.find("td[name='name']").text();
    var callLine        = coachRow.find("td[name='callLine']").text();
    var callRatePerMin  = coachRow.find("td[name='callRatePerMin']").text();
    var response        = coachRow.find("td[name='response']").text();
    var msgLine         = coachRow.find("td[name='messageLine']").text();
    var deqLine         = coachRow.find("td[name='dequeueLine']").text();
    var username        = coachRow.find("td[name='username']").text();
    var password        = coachRow.find("input[name='password']").text();
    
    callRatePerMin = callRatePerMin.replace("$", "");
    var modal   = $(this);
    modal.find("input[name='id']").val(coachId)
    modal.find("input[name='name']").val(name);
    modal.find("input[name='callLine']").val(callLine);
    modal.find("input[name='callRatePerMin']").val(callRatePerMin);
    modal.find("textarea[name='textResponse']").val(response);
    modal.find("input[name='messageLine']").val(msgLine);
    modal.find("input[name='dequeueLine']").val(deqLine);
    modal.find("input[name='username']").val(username);
})

$('#deleteCoachModal').on('show.bs.modal', function (event) {
    
    var button      = $(event.relatedTarget) // Button that triggered the modal
    var coachId     = button.data('id') // Extract info from data-* attributes
    
    var modal   = $(this);
    modal.find("input[name='id']").val(coachId);
})

$('div.btn-group ul.dropdown-menu li a').click(function (e) {
    e.preventDefault();
    var $div = $(this).parent().parent().parent(); 
    var $btn = $div.find('button');
    var selectedText = $(this).text();
    var previousText = $btn.html();
    $btn.button('loading');
    console.log(selectedText);
    var body = {};
    body.isAvailable = selectedText.toLowerCase() === "online" ? true : false;
    body = JSON.stringify(body);
    fetch('/admin/coach/change_availability', {method: "POST",  credentials: 'include', body: body, headers: {'Content-Type': 'application/json'} })
        .then(function(response) {
            return response.json();
        })
        .then(function(status) {
            $btn.html('Availability ' + selectedText + ' <span class="caret"></span>');
            $btn.removeClass('disabled');
            $btn.removeAttr('disabled');
            $div.removeClass('open');
            alert("Availability successfully changed");
        })
        .catch(function(err) {
            $btn.button('reset');
            $btn.html(previousText);
            $div.removeClass('open');
            alert("Unable to change availability");
        })
    return false;
});

$(".phone").text(function(i, text) {
        text = text.substring(2);
        formatNumber = text.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
        return formatNumber;
    });
    
