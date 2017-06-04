

$('#editCoachModal').on('show.bs.modal', function (event) {
    
    var button      = $(event.relatedTarget) // Button that triggered the modal
    var coachId     = button.data('id') // Extract info from data-* attributes
    var coachRow    = button.closest('tr');
    
    var callLine = coachRow.find("td[name='callLine']").text();
    var response = coachRow.find("td[name='response']").text();
    var msgLine  = coachRow.find("td[name='messageLine']").text();
    var deqLine  = coachRow.find("td[name='dequeueLine']").text();
    
    var modal   = $(this);
    modal.find("input[name='id']").val(coachId)
    modal.find("input[name='callLine']").val(callLine);
    modal.find("textarea[name='textResponse']").val(response);
    modal.find("input[name='messageLine']").val(msgLine);
    modal.find("input[name='dequeueLine']").val(deqLine);
})

$('#deleteCoachModal').on('show.bs.modal', function (event) {
    
    var button      = $(event.relatedTarget) // Button that triggered the modal
    var coachId     = button.data('id') // Extract info from data-* attributes
    
    var modal   = $(this);
    modal.find("input[name='id']").val(coachId);
})