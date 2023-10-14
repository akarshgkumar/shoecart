function addToWishlist(buttonElement) {
  const productId = $(buttonElement).data('product-id');

  $.ajax({
    type: 'POST',
    url: '/add-to-wishlist',
    contentType: 'application/json',
    data: JSON.stringify({ productId }),
    success: function (data) {
      if (data.success) {
        showSuccess('Product added to wishlist');
        $("#wishlist-count").text(data.wishlistItems);
      } else if (data.alreadyExists) {
        showAlert('Item already exists in wishlist!');
      } else {
        showAlert('Failed to add product to wishlist!');
      }
    },
    error: function (error) {
      console.error('Error adding to wishlist:', error);
    },
  });
}

function removeFromWishlist(buttonElement) {
  const productId = $(buttonElement).data('product-id');

  $.ajax({
    type: 'POST',
    url: '/remove-from-wishlist',
    contentType: 'application/json',
    data: JSON.stringify({ productId }),
    success: function(data) {
      if (data.success) {
        showSuccess('Product removed from wishlist');
        $(buttonElement).closest("tr").remove();
        $("#wishlist-count").text(data.wishlistItems);
      } else {
        showAlert('Failed to remove product from wishlist!');
      }
    },
    error: function(error) {
      console.error('Error removing from wishlist:', error);
    }
  });
}

function clearWishlist() {
  $.ajax({
    type: 'POST',
    url: '/clear-wishlist',
    success: function(data) {
      if (data.success) {
        showSuccess('Wishlist cleared');
        $("#wishlist-count").text('0');
      } else {
        showAlert('Failed to clear wishlist!');
      }
    },
  });
}